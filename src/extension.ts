import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 自定义命令接口定义
 */
interface CustomCommand {
    id: string;                    // 命令唯一标识符
    name: string;                  // 命令显示名称
    command: string;               // 实际要执行的shell命令
    workingDirectory?: string;     // 可选的工作目录
    description?: string;          // 可选的描述信息
}

/**
 * 命令配置接口定义
 */
interface CommandsConfig {
    commands: CustomCommand[];     // 命令数组
}

// 配置文件名常量
const COMMANDS_CONFIG_FILE = 'commands.json';

/**
 * 插件激活函数
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('自定义终端命令插件已启动');

    // 注册树形数据提供者 - 只需要注册一个，用于活动栏
    const commandsProvider = new CommandsProvider();
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('customCommandsView', commandsProvider)
    );

    // 注册刷新命令
    context.subscriptions.push(
        vscode.commands.registerCommand('customCommands.refresh', () => {
            commandsProvider.refresh();
        })
    );

    // 注册添加命令
    context.subscriptions.push(
        vscode.commands.registerCommand('customCommands.addCommand', async () => {
            await addNewCommand(commandsProvider);
        })
    );

    // 注册编辑命令
    context.subscriptions.push(
        vscode.commands.registerCommand('customCommands.editCommand', async (command: CustomCommand) => {
            await editCommand(commandsProvider, command);
        })
    );

    // 注册删除命令
    context.subscriptions.push(
        vscode.commands.registerCommand('customCommands.deleteCommand', async (command: CustomCommand) => {
            await deleteCommand(commandsProvider, command);
        })
    );

    // 注册执行命令
    context.subscriptions.push(
        vscode.commands.registerCommand('customCommands.executeCommand', async (command: CustomCommand) => {
            await executeCommand(command);
        })
    );
}

/**
 * 命令树形数据提供者类
 */
class CommandsProvider implements vscode.TreeDataProvider<CommandItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CommandItem | undefined | null | void> = new vscode.EventEmitter<CommandItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CommandItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() { }

    /**
     * 刷新树形视图
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * 获取树形项的UI表示
     */
    getTreeItem(element: CommandItem): vscode.TreeItem {
        return element;
    }

    /**
     * 获取子节点
     */
    getChildren(element?: CommandItem): Thenable<CommandItem[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(this.getCommands());
        }
    }

    /**
     * 获取工作空间中的配置文件路径
     */
    private getWorkspaceConfigPath(): string | null {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return null;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders[0];
        const vscodeDir = path.join(workspaceFolder.uri.fsPath, '.vscode');

        if (!fs.existsSync(vscodeDir)) {
            fs.mkdirSync(vscodeDir, { recursive: true });
        }

        return path.join(vscodeDir, COMMANDS_CONFIG_FILE);
    }

    /**
     * 加载所有命令
     */
    private getCommands(): CommandItem[] {
        const configPath = this.getWorkspaceConfigPath();

        if (!configPath) {
            vscode.window.showWarningMessage('请先打开一个文件夹才能使用快捷命令');
            return [];
        }

        if (!fs.existsSync(configPath)) {
            // 创建默认的中文配置
            const defaultConfig: CommandsConfig = {
                commands: [
                    {
                        id: '1',
                        name: '查看文件',
                        command: 'ls -la',
                        description: '显示当前目录所有文件'
                    },
                    {
                        id: '2',
                        name: 'Node版本',
                        command: 'node --version',
                        workingDirectory: '${workspaceFolder}',
                        description: '查看Node.js版本号'
                    },
                    {
                        id: '3',
                        name: 'Git状态',
                        command: 'git status',
                        workingDirectory: '${workspaceFolder}',
                        description: '查看Git仓库状态'
                    },
                    {
                        id: '4',
                        name: '启动服务',
                        command: 'npm start',
                        workingDirectory: '${workspaceFolder}',
                        description: '启动开发服务器'
                    }
                ]
            };
            this.saveConfig(defaultConfig);
            return defaultConfig.commands.map(command => new CommandItem(command));
        }

        try {
            const content = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(content);
            return config.commands.map((command: CustomCommand) => new CommandItem(command));
        } catch (error) {
            console.error('读取配置失败:', error);
            vscode.window.showErrorMessage(`读取命令失败: ${error}`);
            return [];
        }
    }

    /**
     * 保存配置到文件
     */
    private saveConfig(config: CommandsConfig): void {
        const configPath = this.getWorkspaceConfigPath();

        if (!configPath) {
            vscode.window.showWarningMessage('请先打开一个文件夹才能保存命令');
            return;
        }

        try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            if (config.commands.length > 0) {
                vscode.window.setStatusBarMessage('命令已保存到 .vscode/commands.json', 2000);
            }
        } catch (error) {
            console.error('保存配置失败:', error);
            vscode.window.showErrorMessage(`保存命令失败: ${error}`);
        }
    }

    /**
     * 添加新命令
     */
    public addCommand(command: CustomCommand): void {
        const configPath = this.getWorkspaceConfigPath();

        if (!configPath) {
            vscode.window.showWarningMessage('请先打开一个文件夹才能添加命令');
            return;
        }

        let config: CommandsConfig = { commands: [] };

        if (fs.existsSync(configPath)) {
            try {
                const content = fs.readFileSync(configPath, 'utf8');
                config = JSON.parse(content);
            } catch (error) {
                console.error('读取现有配置失败:', error);
            }
        }

        config.commands.push(command);
        this.saveConfig(config);
        this.refresh();
    }

    /**
     * 更新现有命令
     */
    public updateCommand(updatedCommand: CustomCommand): void {
        const configPath = this.getWorkspaceConfigPath();

        if (!configPath) {
            vscode.window.showWarningMessage('请先打开一个文件夹才能修改命令');
            return;
        }

        if (!fs.existsSync(configPath)) {
            vscode.window.showWarningMessage('未找到命令文件');
            return;
        }

        try {
            const content = fs.readFileSync(configPath, 'utf8');
            const config: CommandsConfig = JSON.parse(content);
            const index = config.commands.findIndex(c => c.id === updatedCommand.id);

            if (index !== -1) {
                config.commands[index] = updatedCommand;
                this.saveConfig(config);
                this.refresh();
            }
        } catch (error) {
            console.error('更新命令失败:', error);
            vscode.window.showErrorMessage(`修改命令失败: ${error}`);
        }
    }

    /**
     * 删除命令
     */
    public deleteCommand(commandId: string): void {
        const configPath = this.getWorkspaceConfigPath();

        if (!configPath) {
            vscode.window.showWarningMessage('请先打开一个文件夹才能删除命令');
            return;
        }

        if (!fs.existsSync(configPath)) {
            vscode.window.showWarningMessage('未找到命令文件');
            return;
        }

        try {
            const content = fs.readFileSync(configPath, 'utf8');
            const config: CommandsConfig = JSON.parse(content);
            config.commands = config.commands.filter(c => c.id !== commandId);
            this.saveConfig(config);
            this.refresh();
        } catch (error) {
            console.error('删除命令失败:', error);
            vscode.window.showErrorMessage(`删除命令失败: ${error}`);
        }
    }
}

/**
 * 命令树形项类
 */
class CommandItem extends vscode.TreeItem {
    /**
     * 构造函数
     */
    constructor(public readonly commandData: CustomCommand) {
        // 调用父类构造函数
        super(commandData.name, vscode.TreeItemCollapsibleState.None);

        // 设置工具提示和描述
        this.tooltip = commandData.description || commandData.command;
        this.description = commandData.description;

        // 设置图标 - 使用更合适的图标
        this.iconPath = new vscode.ThemeIcon('terminal');

        // 设置点击命令
        this.command = {
            command: 'customCommands.executeCommand',
            title: '',
            arguments: [commandData]
        };

        // 设置上下文值
        this.contextValue = 'command';
    }
}

/**
 * 执行命令的核心函数
 */
async function executeCommand(command: CustomCommand): Promise<void> {
    try {
        // 处理工作目录
        let workingDir = command.workingDirectory || '${workspaceFolder}';

        // 替换工作目录中的变量
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
            workingDir = workingDir.replace('${workspaceFolder}', workspaceFolder);
        }

        // 验证工作目录是否存在
        if (!fs.existsSync(workingDir) && !workingDir.includes('${')) {
            vscode.window.showErrorMessage(`目录不存在: ${workingDir}`);
            return;
        }

        // 查找或创建终端
        const terminalName = `命令: ${command.name}`;
        let terminal = vscode.window.terminals.find(t => t.name === terminalName);

        if (!terminal) {
            terminal = vscode.window.createTerminal(terminalName);
        }

        // 显示终端并发送命令
        terminal.show();

        // 切换目录
        if (workingDir && !workingDir.includes('${')) {
            terminal.sendText(`cd "${workingDir}"`);
        }

        // 发送命令
        terminal.sendText(command.command);

        // 显示执行成功的提示
        vscode.window.showInformationMessage(`执行: ${command.name}`);

    } catch (error) {
        vscode.window.showErrorMessage(`执行命令失败: ${error}`);
    }
}

/**
 * 添加新命令的交互函数
 */
async function addNewCommand(provider: CommandsProvider): Promise<void> {
    // 获取命令名称
    const name = await vscode.window.showInputBox({
        prompt: '命令名称',
        placeHolder: '例如: 构建项目'
    });

    if (!name) return;

    // 获取要执行的命令
    const command = await vscode.window.showInputBox({
        prompt: '执行命令',
        placeHolder: '例如: npm run build'
    });

    if (!command) return;

    // 获取可选的工作目录
    const workingDirectory = await vscode.window.showInputBox({
        prompt: '工作目录（可选）',
        placeHolder: '例如: ${workspaceFolder} 或 /path/to/project'
    });

    // 获取可选的描述信息
    const description = await vscode.window.showInputBox({
        prompt: '描述（可选）',
        placeHolder: '例如: 使用npm构建项目'
    });

    // 创建新的命令对象
    const newCommand: CustomCommand = {
        id: Date.now().toString(),
        name: name.trim(),
        command: command.trim(),
        workingDirectory: workingDirectory?.trim() || undefined,
        description: description?.trim() || undefined
    };

    // 添加命令
    provider.addCommand(newCommand);
    vscode.window.showInformationMessage(`已添加命令: ${name}`);
}

/**
 * 编辑现有命令的交互函数
 */
async function editCommand(provider: CommandsProvider, command: CustomCommand): Promise<void> {
    // 获取新的命令名称
    const name = await vscode.window.showInputBox({
        prompt: '命令名称',
        value: command.name
    });

    if (!name) return;

    // 获取新的命令内容
    const cmd = await vscode.window.showInputBox({
        prompt: '执行命令',
        value: command.command
    });

    if (!cmd) return;

    // 获取新的工作目录
    const workingDirectory = await vscode.window.showInputBox({
        prompt: '工作目录（可选）',
        value: command.workingDirectory || ''
    });

    // 获取新的描述
    const description = await vscode.window.showInputBox({
        prompt: '描述（可选）',
        value: command.description || ''
    });

    // 创建更新后的命令对象
    const updatedCommand: CustomCommand = {
        ...command,
        name: name.trim(),
        command: cmd.trim(),
        workingDirectory: workingDirectory?.trim() || undefined,
        description: description?.trim() || undefined
    };

    // 更新命令
    provider.updateCommand(updatedCommand);
    vscode.window.showInformationMessage(`已修改命令: ${name}`);
}

/**
 * 删除命令的交互函数
 */
async function deleteCommand(provider: CommandsProvider, command: CustomCommand): Promise<void> {
    // 显示确认删除的对话框
    const result = await vscode.window.showWarningMessage(
        `确定要删除命令"${command.name}"吗？`,
        { modal: true },
        '确定',
        '取消'
    );

    // 如果用户点击"确定"，执行删除
    if (result === '确定') {
        provider.deleteCommand(command.id);
        vscode.window.showInformationMessage(`已删除命令: ${command.name}`);
    }
}

/**
 * 插件停用函数
 */
export function deactivate() { }