'use strict';

const {join, parse} = require('path');

const {createConnection, Files, ProposedFeatures, TextDocuments} = require('vscode-languageserver');
const findPkgDir = require('find-pkg-dir');
const pathIsInside = require('path-is-inside');
const {ExecuteCommandRequest} = require('vscode-languageserver');
const stylelintVSCode = require('./stylelint-vscode');

let config;
let configOverrides;
let autoFix = false;
let serverIndex = process.argv.find(arg => /^--server-index=\d+$/u.test(arg));
serverIndex = /^--server-index=(\d+)$/u.exec(serverIndex)[1];
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
	let workspacePath;
	if (documentPath) {
		const workspaceFolders = await connection.workspace.getWorkspaceFolders();
		if (workspaceFolders) {
			for (const {uri} of workspaceFolders) {
				workspacePath = Files.uriToFilePath(uri);
				if (pathIsInside(documentPath, workspacePath)) {
					options.ignorePath = join(workspacePath, '.stylelintignore');
					break;
				}
				workspacePath = null;
			}
		}
		if (options.ignorePath === undefined) {
			options.ignorePath = join(findPkgDir(documentPath) || parse(documentPath).root, '.stylelintignore');
		}
	}
	if (workspacePath) {
		options.workspace = workspacePath;
	}
	options.allowEmptyInput = true;
	try {
		connection.sendDiagnostics({
			uri: document.uri,
			diagnostics: await stylelintVSCode(document, options)
		});
	} catch (err) {
		if (err.code === -101010) {
			connection.console.warn(`${err.message}\n${err.stack}`);
			return;
		}
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
// connection
connection.onInitialize((/* params */) => {
	validateAll();
	connection.console.log(`启动语言服务(${serverIndex})`);
	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
			executeCommandProvider: {
				commands: [`stylelint.applyAutoFix.${serverIndex}`]
			}
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
connection.onRequest(ExecuteCommandRequest.type, ({command, arguments: [identifier]}) => {
	connection.console.log(`接收到指令: ${command}`);
	if (command === `stylelint.applyAutoFix.${serverIndex}`) {
		const uri = identifier.uri;
		const textDocument = documents.get(uri);
		if (!textDocument || identifier.version !== textDocument.version) {
			return;
		}
		connection.console.log(`语言服务(${serverIndex}) 执行 fix 给文件(${uri})`);
		validate(textDocument, true);
	}
});
// document
documents.onDidChangeContent(({document}) => validate(document));
documents.onDidSave(({document}) => {
	if (autoFix) {
		validate(document, autoFix);
	}
});
documents.onDidClose(({document}) => connection.sendDiagnostics({
	uri: document.uri,
	diagnostics: []
}));
documents.listen(connection);

connection.listen();
