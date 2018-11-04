'use strict';

const {LanguageClient, SettingMonitor} = require('vscode-languageclient');
const {workspace} = require('vscode');
const {activationEvents} = require('./package.json');

const documentSelector = [];

for (const activationEvent of activationEvents) {
	if (activationEvent.startsWith('onLanguage:')) {
		const language = activationEvent.replace('onLanguage:', '');
		documentSelector.push({language, scheme: 'file'}, {language, scheme: 'untitled'});
	}
}

exports.activate = ({subscriptions}) => {
	const serverPath = require.resolve('./server.js');
	workspace.workspaceFolders.forEach((folder, index) => {
		const client = new LanguageClient('stylelint', {
			run: {
				module: serverPath
			},
			debug: {
				module: serverPath,
				options: {
					execArgv: [
						'--nolazy',
						`--inspect=${6004 + index}`
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
			sendNotification(type, params);
		};
		subscriptions.push(new SettingMonitor(client, 'stylelint.enable').start());
	});
};
