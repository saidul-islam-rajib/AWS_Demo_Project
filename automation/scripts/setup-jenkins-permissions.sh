set -e

echo "Setting up Jenkins sudo permissions for blue-green deployment..."

# Create sudoers configuration for Jenkins
cat > /tmp/jenkins-sudoers << 'EOF'
# Allow jenkins user to run specific commands without password
jenkins ALL=(ALL) NOPASSWD: /usr/bin/tee /etc/caddy/upstream.conf
jenkins ALL=(ALL) NOPASSWD: /bin/systemctl reload caddy
jenkins ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload caddy
jenkins ALL=(ALL) NOPASSWD: /usr/bin/caddy reload
EOF

# Validate syntax
if visudo -c -f /tmp/jenkins-sudoers; then
    echo "✓ Sudoers syntax is valid"
    
    # Install the sudoers file
    cp /tmp/jenkins-sudoers /etc/sudoers.d/jenkins
    chmod 0440 /etc/sudoers.d/jenkins
    echo "✓ Installed /etc/sudoers.d/jenkins"
    
    # Create Caddy config directory if it doesn't exist
    mkdir -p /etc/caddy
    
    # Create initial upstream config if it doesn't exist
    if [ ! -f /etc/caddy/upstream.conf ]; then
        echo "127.0.0.1:3001" > /etc/caddy/upstream.conf
        echo "✓ Created /etc/caddy/upstream.conf with default value"
    else
        echo "✓ /etc/caddy/upstream.conf already exists"
    fi
    
    # Set appropriate permissions
    chown root:root /etc/caddy/upstream.conf
    chmod 644 /etc/caddy/upstream.conf
    
    # Test the configuration
    echo ""
    echo "Testing configuration..."
    if sudo -u jenkins sudo tee /etc/caddy/upstream.conf <<< "127.0.0.1:3001" > /dev/null; then
        echo "✓ Jenkins can write to upstream.conf"
    else
        echo "✗ Failed to write to upstream.conf"
        exit 1
    fi
    
    if sudo -u jenkins sudo systemctl reload caddy 2>/dev/null; then
        echo "✓ Jenkins can reload Caddy"
    else
        echo "⚠ Could not test Caddy reload (service might not be running)"
    fi
    
    echo ""
    echo "✓ Setup complete! Jenkins now has permission to perform blue-green deployments."
    
else
    echo "✗ Sudoers syntax validation failed!"
    exit 1
fi

# Cleanup
rm -f /tmp/jenkins-sudoers
