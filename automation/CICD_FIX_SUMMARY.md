# CI/CD Deployment Fix Summary

## Issue Fixed
Your blue-green deployment was failing with:
```
sudo: I'm sorry jenkins. I'm afraid I can't do that
```

## Root Cause
The Jenkins user on your EC2 instance doesn't have permission to:
1. Write to `/etc/caddy/upstream.conf`
2. Reload the Caddy web server

These permissions are required for the blue-green deployment to switch traffic from the old version to the new version.

## Files Created

### Deployment Scripts
- **scripts/deploy.sh** - Main blue-green deployment orchestration
- **scripts/switch-upstream.sh** - Switches Caddy upstream to new deployment
- **scripts/setup-jenkins-permissions.sh** - Automated sudo configuration script
- **scripts/jenkins-sudoers** - Sudoers template

### Documentation
- **scripts/QUICK_FIX.md** - Quick 2-minute fix guide ⚡
- **scripts/DEPLOYMENT_SETUP.md** - Detailed setup and troubleshooting
- **scripts/README.md** - Overview of deployment scripts

### Configuration
- **.gitattributes** - Ensures shell scripts use Unix line endings (LF)

## Next Steps

### 1. Commit and push the new files

```bash
git add scripts/ .gitattributes CICD_FIX_SUMMARY.md
git commit -m "Add blue-green deployment scripts and fix sudo permissions"
git push
```

### 2. Configure sudo permissions on your EC2 instance

**Quick method (recommended):**

SSH into your EC2 instance and run:

```bash
sudo tee /etc/sudoers.d/jenkins > /dev/null << 'EOF'
jenkins ALL=(ALL) NOPASSWD: /usr/bin/tee /etc/caddy/upstream.conf
jenkins ALL=(ALL) NOPASSWD: /bin/systemctl reload caddy
jenkins ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload caddy
jenkins ALL=(ALL) NOPASSWD: /usr/bin/caddy reload
EOF

sudo chmod 0440 /etc/sudoers.d/jenkins
sudo visudo -c  # Should output "parsed OK"

# Create Caddy config
sudo mkdir -p /etc/caddy
echo "127.0.0.1:3001" | sudo tee /etc/caddy/upstream.conf > /dev/null

# Test
sudo -u jenkins sudo tee /etc/caddy/upstream.conf <<< "127.0.0.1:3001"
```

**Automated method:**

```bash
# Copy and run the setup script
scp -i your-key.pem scripts/setup-jenkins-permissions.sh ec2-user@your-ec2-ip:/tmp/
ssh -i your-key.pem ec2-user@your-ec2-ip
sudo bash /tmp/setup-jenkins-permissions.sh
```

### 3. Trigger a new deployment

After the above steps, your next Jenkins deployment should succeed!

## Expected Success Output

After the fix, your deployment logs will show:

```
Active upstream: none — deploying blue on 3001.
Waiting for blue to answer on 3001...
  healthy after 2 attempt(s).
[switch] Pointing Caddy at 127.0.0.1:3001
[switch] Caddy reloaded successfully
Deployment complete! blue is now live on port 3001.
```

## How Blue-Green Deployment Works

```
┌────────────────────────────────────┐
│ 1. Blue (3001) currently active    │
└────────────────────────────────────┘
              ↓
┌────────────────────────────────────┐
│ 2. Deploy new version to Green     │
│    (3002) in background            │
└────────────────────────────────────┘
              ↓
┌────────────────────────────────────┐
│ 3. Health check Green (3002)       │
└────────────────────────────────────┘
              ↓
┌────────────────────────────────────┐
│ 4. Switch Caddy to Green (3002)    │
│    ← This step was failing!        │
└────────────────────────────────────┘
              ↓
┌────────────────────────────────────┐
│ 5. Stop Blue (3001)                │
└────────────────────────────────────┘
              ↓
┌────────────────────────────────────┐
│ Green (3002) now active            │
└────────────────────────────────────┘
```

## Benefits

✅ Zero-downtime deployments
✅ Easy rollback (just switch back)
✅ Test new version in production environment before switching
✅ Automated health checks before traffic switch

## Troubleshooting

If you still encounter issues, see:
- **scripts/QUICK_FIX.md** - Quick troubleshooting steps
- **scripts/DEPLOYMENT_SETUP.md** - Detailed troubleshooting guide

Common issues:
- Caddy not running → `sudo systemctl status caddy`
- Container not starting → `docker logs nestjs-app-blue`
- Health check failing → `curl http://127.0.0.1:3001/health`

## Security Note

The sudoers configuration follows the principle of least privilege:
- Only specific commands are allowed
- No shell access or arbitrary command execution
- Full command paths prevent PATH manipulation
- Changes are audited in system logs
