Run this command in the terminal and show the output to the user:

```bash
skillshare init
```

If the command is not found, tell the user to install Skills Exchange first:

```bash
curl -fsSL https://raw.githubusercontent.com/Enspy/skillshare/main/install.sh | bash
```

After a successful init, confirm that their username is registered and that the slash commands `/skills-send`, `/skills-inbox`, `/skills-who`, and `/skills-add` are now available.
