'use strict';

const {ExecuteCommandRequest, LanguageClient, SettingMonitor} = require('vscode-languageclient');
const {commands: {registerCommand}, window, workspace} = require('vscode');
const {activationEvents, contributes: {commands}} = require('./package.json');

const documentSelector = [];
const clients = [];

for (const activationEvent of activationEvents) {
	if (activationEvent.startsWith('onLanguage:')) {
		const language = activationEvent.replace('onLanguage:', '');
		documentSelector.push({language, scheme: 'file'}, {language, scheme: 'untitled'});
	}
}
const cmdHandles = commands.map(command => registerCommand(command.command, (/* uri */) => {
	console.log('接收到指令', command.command);
	if (command.command === 'stylelint.executeAutoFix') {
		const textEditor = window.activeTextEditor;
		if (!textEditor) {
			return;
		}
		Promise.all(clients.map((client, index) => {
			const textDocument = {
				uri: textEditor.document.uri.toString(),
				version: textEditor.document.version
			};
			const folderPath = client.clientOptions.workspaceFolder.uri.path;
			const filePath = decodeURIComponent(textDocument.uri.replace(/^file:\/{2}/u, ''));
			if (!filePath.startsWith(`${folderPath}/`)) {
				return undefined;
			}
			const serverIndex = index + 1;
			const params = {
				command: `stylelint.applyAutoFix.${serverIndex}`,
				arguments: [textDocument]
			};
			console.log('发送指令', params.command, '给语言服务', serverIndex);
			return client.sendRequest(ExecuteCommandRequest.type, params).catch(() => {
				window.showErrorMessage('Failed to apply stylelint fixes to the document. Please consider opening an issue with steps to reproduce.');
			});
		}));
	}
}));
exports.activate = ({subscriptions}) => {
	const serverPath = require.resolve('./server.js');
	workspace.workspaceFolders.forEach((folder, index) => {
		const j = index + 1;
		const client = new LanguageClient('stylelint', {
			run: {
				module: serverPath,
				args: [`--server-index=${j}`]
			},
			debug: {
				module: serverPath,
				args: [`--server-index=${j}`],
				options: {
					execArgv: [
						'--nolazy',
						`--inspect=${6004 + j}`
					]
				}
			}
		}, {
			workspaceFolder: folder,
			documentSelector,
			synchronize: {
				configurationSection: 'stylelint',
				fileEvents: workspace.createFileSystemWatcher('**/{.stylelintrc{,.js,.json,.yaml,.yml},stylelint.config.js,.stylelintignore}')
			}
		});
		const sendNotification = client.sendNotification.bind(client);
		client.sendNotification = function(type, params) {
			if (params.textDocument && params.textDocument.uri) {
				const folderPath = this.clientOptions.workspaceFolder.uri.path;
				const filePath = decodeURIComponent(params.textDocument.uri.replace(/^file:\/{2}/u, ''));
				if (!filePath.startsWith(`${folderPath}/`)) {
					return;
				}
			}
			console.log('sendNotification', type, params);
			sendNotification(type, params);
		};
		subscriptions.push(new SettingMonitor(client, 'stylelint.enable').start());
		clients.push(client);
	});
	subscriptions.push(...cmdHandles);
};
