# Temporary HTTPS demo link (Windows)

This exposes a demo running on your PC through a temporary HTTPS address. Keep the PC, MySQL, Flask, chatbot, Caddy, and tunnel running while someone uses the link. The random link changes when the tunnel restarts. It is for a short demo, not permanent hosting. Anyone who gets the link can open the demo, so only use sample data.

## One-time setup

1. Install Caddy and `cloudflared` from their official Windows downloads.
2. In MySQL Workbench, create a restricted app user. Use a unique password and keep it private:

   ```sql
   CREATE USER 'govbridge_app'@'127.0.0.1' IDENTIFIED BY 'choose-a-long-unique-password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON govbridge.* TO 'govbridge_app'@'127.0.0.1';
   ```

3. Run the backend using the `share` configuration below. Do not set `GOVBRIDGE_ENV=production`; production mode deliberately refuses to start until the full production review is complete.

## Start the preview

Use four VS Code PowerShell terminals. Start MySQL first.

**Terminal 1 - main API:**

```powershell
Set-Location "E:\SIH main\GovBridge\backend"
.\venv\Scripts\python.exe -m pip install -r requirements.txt
$env:GOVBRIDGE_ENV = "share"
$env:GOVBRIDGE_DB_USER = "govbridge_app"
$secureDbPassword = Read-Host "MySQL app-user password" -AsSecureString
$dbCredential = [PSCredential]::new("govbridge_app", $secureDbPassword)
$env:GOVBRIDGE_DB_PASSWORD = $dbCredential.GetNetworkCredential().Password
$env:GOVBRIDGE_SECRET_KEY = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
$env:GOVBRIDGE_GOV_SIGNUP_CODE = [guid]::NewGuid().ToString("N")
Write-Host "Keep this Government invite code private: $env:GOVBRIDGE_GOV_SIGNUP_CODE"
.\venv\Scripts\python.exe app.py
```

Save the printed invitation code somewhere private if you need to create a Government account during the demo. Do not send it with the public link.

**Terminal 2 - chatbot:**

```powershell
Set-Location "E:\SIH main\GovBridge\backend"
.\venv\Scripts\python.exe chatbot_api.py
```

Without a Gemini key, the chatbot uses its offline FAQ.

**Terminal 3 - local web server and API proxy:**

```powershell
Set-Location "E:\SIH main\GovBridge"
caddy run --config Caddyfile
```

**Terminal 4 - temporary HTTPS link:**

```powershell
cloudflared tunnel --url http://127.0.0.1:8080
```

Copy the `https://` address ending in `.trycloudflare.com` printed by `cloudflared` and send that address to your demo users. They can create Startup accounts. Government account registration requires the invitation code configured in Terminal 1.

## Stop sharing

Press **Ctrl+C** in Terminal 4 first to close the public tunnel, then stop Caddy and both Flask servers. Keep MySQL private; never tunnel port `3306`.

The browser UI still contains prototype workflows stored in each visitor's browser. Login, startup profiles, recommendations, challenges, and proposals use the backend; several other dashboard actions are sample/demo behavior and do not yet sync between different visitors. The `X-Robots-Tag` header asks search engines not to index the preview, but it does not password-protect the link.
