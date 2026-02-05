## run commands in terminal

![alt text](image.png)


快速执行命令

.vscode/commands.json

```
{
  "commands": [
    {
      "id": "1",
      "name": "run",
      "command": "uv run main.py",
      "workingDirectory": "${workspaceFolder}/back",
      "description": "uv run"
    },
    {
      "id": "2",
      "name": "dev",
      "command": "pnpm run dev",
      "workingDirectory": "${workspaceFolder}/web",
      "description": "pnpm run dev"
    },
    {
      "id": "2",
      "name": "ls",
      "command": "ls",
      "workingDirectory": "${workspaceFolder}",
      "description": "ls"
    }
  ]
}
```