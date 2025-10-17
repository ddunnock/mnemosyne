# Security Policy

## 🛡️ Our Security Commitment

Mnemosyne takes security seriously. As an AI agent platform that handles sensitive data, API keys, and personal knowledge, we are committed to maintaining the highest security standards to protect our users.

## 🔒 Security Features

### Data Protection

- **AES-256 Encryption** - All API keys are encrypted using military-grade encryption
- **Vault-Scoped Keys** - Each Obsidian vault uses unique encryption keys
- **Zero-Knowledge Architecture** - Master passwords are never stored or transmitted
- **Local Processing** - Option to keep all data processing completely local with Ollama
- **Secure Memory** - Automatic cleanup of sensitive data from memory

### API Key Security

- **Encrypted Storage** - API keys are encrypted before storage
- **In-Memory Protection** - Keys are only decrypted when needed
- **Vault Isolation** - Keys are isolated per Obsidian vault
- **No Cloud Storage** - Keys never leave your device unencrypted

### Network Security

- **HTTPS Only** - All external API communications use TLS 1.2+
- **Certificate Validation** - Proper SSL/TLS certificate verification
- **No Data Collection** - No telemetry or usage data is collected
- **Local-First** - Most operations work entirely offline

## 🚨 Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | ✅ Full support    |
| 0.9.x   | ✅ Security updates only |
| < 0.9   | ❌ Not supported   |

## 📢 Reporting Security Vulnerabilities

We take all security vulnerabilities seriously. If you discover a security issue, please help us protect our users by following responsible disclosure practices.

### 🔐 Reporting Process

**Please DO NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them privately using one of these methods:

#### Option 1: GitHub Security Advisory (Preferred)
1. Go to our [Security Advisories page](https://github.com/dunnock/mnemosyne/security/advisories)
2. Click "Report a vulnerability"
3. Fill out the security advisory form

#### Option 2: Email
Send details to: **security@mnemosyne-ai.com** (or contact through GitHub if email unavailable)

### 📋 What to Include

Please include as much information as possible:

- **Type of issue** (e.g., buffer overflow, SQL injection, cross-site scripting)
- **Full paths of source file(s)** related to the issue
- **Location of affected source code** (tag/branch/commit or direct URL)
- **Special configuration required** to reproduce the issue
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the issue** including how an attacker might exploit it

### ⏰ Response Timeline

- **Initial Response**: Within 48 hours
- **Triage**: Within 1 week
- **Fix Timeline**: Depends on severity (see below)
- **Public Disclosure**: After fix is released and users have time to update

## 🎯 Vulnerability Severity Levels

### Critical (CVSS 9.0-10.0)
- **Response Time**: 24-48 hours
- **Fix Timeline**: 1-3 days
- **Examples**: Remote code execution, complete system compromise

### High (CVSS 7.0-8.9)
- **Response Time**: 48-72 hours
- **Fix Timeline**: 1-2 weeks
- **Examples**: Privilege escalation, sensitive data exposure

### Medium (CVSS 4.0-6.9)
- **Response Time**: 1 week
- **Fix Timeline**: 2-4 weeks
- **Examples**: Information disclosure, denial of service

### Low (CVSS 0.1-3.9)
- **Response Time**: 2 weeks
- **Fix Timeline**: Next regular release
- **Examples**: Minor information leaks, low-impact issues

## 🏆 Security Researcher Recognition

We appreciate the security research community's efforts to keep Mnemosyne secure. Researchers who responsibly disclose vulnerabilities will be:

- **Credited** in our security advisories (if desired)
- **Thanked** in release notes
- **Added** to our Hall of Fame (if significant finding)
- **Considered** for bug bounty rewards (program coming soon)

## 🔒 Security Best Practices for Users

### API Key Management

- ✅ **Use strong master passwords** (12+ characters, mixed case, numbers, symbols)
- ✅ **Never share your master password** with anyone
- ✅ **Use different master passwords** for different vaults
- ✅ **Regularly rotate API keys** with your AI providers
- ❌ **Never commit API keys to version control**

### Vault Security

- ✅ **Keep Obsidian updated** to the latest version
- ✅ **Keep Mnemosyne updated** to the latest version
- ✅ **Use encrypted storage** for sensitive vaults
- ✅ **Regular backups** of your encrypted vault data
- ❌ **Don't store sensitive data in plain text** in notes

### Network Security

- ✅ **Use secure networks** when accessing cloud AI services
- ✅ **Consider local AI** (Ollama) for sensitive data
- ✅ **Enable firewall** protection on your device
- ❌ **Avoid public WiFi** for sensitive AI operations

## 🔍 Security Audits

### Internal Security Measures

- **Code Reviews** - All code changes undergo security review
- **Dependency Scanning** - Regular audits of third-party dependencies
- **Static Analysis** - Automated security scanning of our codebase
- **Penetration Testing** - Regular security testing of the application

### External Audits

- **Third-party Security Audit**: Planned for Q2 2024
- **Dependency Audits**: Monthly automated scans
- **Community Review**: Open source for transparency

## 🚫 Security Hall of Shame

We maintain a list of security vulnerabilities that have been fixed:

- **CVE-YYYY-XXXX**: Description of vulnerability (fixed in v1.x.x)

*No vulnerabilities reported yet - we're just getting started!*

## 📚 Security Resources

### For Developers

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [TypeScript Security Guidelines](https://github.com/microsoft/TypeScript/wiki/Security)

### For Users

- [Obsidian Security](https://obsidian.md/security)
- [Password Security](https://www.nist.gov/blogs/taking-measure/easy-ways-build-better-p5w0rd)
- [API Key Management](https://cloud.google.com/docs/authentication/api-keys)

## 🔄 Security Updates

Subscribe to security updates:

- **GitHub Security Advisories** - Automatic notifications for security releases
- **Release Notes** - All releases include security update information
- **Security Mailing List** - Coming soon

## 📞 Contact Information

### Security Team

- **Security Lead**: David Dunnock
- **Response Team**: security@mnemosyne-ai.com
- **PGP Key**: Available on request

### General Contact

- **GitHub Issues**: For non-security bugs and features
- **Discussions**: For questions and community support

---

## 📜 Disclosure Policy

We follow a **coordinated disclosure** policy:

1. **Report received** and acknowledged
2. **Investigation** begins immediately
3. **Fix developed** and tested
4. **Release prepared** with fix
5. **Public disclosure** after release
6. **Credit given** to researcher (if desired)

We believe in transparency and will publish security advisories for all confirmed vulnerabilities after they are fixed.

---

**Last updated**: October 17, 2024  
**Next review**: January 17, 2025

For questions about this security policy, please contact us through GitHub or email.