'use strict';

const {join, parse} = require('path');

const {createConnection, Files, ProposedFeatures, TextDocuments} = require('vscode-languageserver');
const findPkgDir = require('find-pkg-dir');
const pathIsInside = require('path-is-inside');
const stylelintVSCode = require('./stylelint-vscode');

let config;
let configOverrides;
let autoFix = false;

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments();

async function validate(document, autoFix_) {
	const options = {
		fix: !!autoFix_
	};
	if (config) {
		options.config = config;
	}
	if (configOverrides) {
		options.configOverrides = configOverrides;
	}
	const documentPath = Files.uriToFilePath(document.uri);
	if (documentPath) {
		const workspaceFolders = await connection.workspace.getWorkspaceFolders();

		if (workspaceFolders) {
			for (const {uri} of workspaceFolders) {
				const workspacePath = Files.uriToFilePath(uri);

				if (pathIsInside(documentPath, workspacePath)) {
					options.ignorePath = join(workspacePath, '.stylelintignore');
					break;
				}
			}
		}

		if (options.ignorePath === undefined) {
			options.ignorePath = join(findPkgDir(documentPath) || parse(documentPath).root, '.stylelintignore');
		}
	}
	try {
		connection.sendDiagnostics({
			uri: document.uri,
			diagnostics: await stylelintVSCode(document, options)
		});
	} catch (err) {
		if (err.reasons) {
			for (const reason of err.reasons) {
				connection.window.showErrorMessage(`stylelint: ${reason}`);
			}

			return;
		}

		// https://github.com/stylelint/stylelint/blob/9.5.0/lib/utils/configurationError.js#L9
		if (err.code === 78) {
			connection.window.showErrorMessage(`stylelint: ${err.message}`);
			return;
		}

		connection.window.showErrorMessage(err.stack.replace(/\n/ug, ' '));
	}
}

function validateAll() {
	for (const document of documents.all()) {
		validate(document);
	}
}

connection.onInitialize(() => {
	validateAll();

	return {
		capabilities: {
			textDocumentSync: documents.syncKind
		}
	};
});
connection.onDidChangeConfiguration(({settings}) => {
	config = settings.stylelint.config;
	configOverrides = settings.stylelint.configOverrides;
	autoFix = settings.stylelint.autoFix;
	validateAll();
});
connection.onDidChangeWatchedFiles(validateAll);
documents.onDidChangeContent(({document}) => validate(document));
documents.onDidSave(({document}) => {
	if (autoFix) {
		connection.console.info(`onDidSave:document: ${JSON.stringify(document)}`);
		validate(document, autoFix);
	}
});
documents.onDidClose(({document}) => connection.sendDiagnostics({
	uri: document.uri,
	diagnostics: []
}));
documents.listen(connection);

connection.listen();
