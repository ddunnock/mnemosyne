/**
 * MasterPasswordModal - Secure Master Password Management
 * 
 * Provides UI for setting, changing, and verifying master passwords
 * with security validation and user-friendly feedback.
 */

import { App, Modal, Notice } from 'obsidian';
import { KeyManager, EncryptedData } from '../../encryption/keyManager';

export interface MasterPasswordModalOptions {
    mode: 'set' | 'change' | 'verify';
    title?: string;
    description?: string;
    onSuccess: (password?: string, verificationData?: EncryptedData) => Promise<void>;
    onCancel?: () => void;
    existingVerificationData?: EncryptedData;
}

export class MasterPasswordModal extends Modal {
    private keyManager: KeyManager;
    private options: MasterPasswordModalOptions;
    private currentPassword: string = '';
    private newPassword: string = '';
    private confirmPassword: string = '';
    private isSubmitting: boolean = false;
    private wasSuccessful: boolean = false;

    constructor(app: App, keyManager: KeyManager, options: MasterPasswordModalOptions) {
        super(app);
        this.keyManager = keyManager;
        this.options = options;
    }

    onOpen(): void {
        this.injectStyles();
        this.renderModal();
    }

    onClose(): void {
        // Clear sensitive data from memory
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';

        // Only call onCancel if the operation wasn't successful
        if (!this.wasSuccessful && this.options.onCancel) {
            this.options.onCancel();
        }
    }

    private renderModal(): void {
        const { contentEl } = this;
        contentEl.empty();

        // Modal header
        const header = contentEl.createEl('div', { cls: 'master-password-header' });
        
        const icon = header.createEl('div', { cls: 'modal-icon' });
        icon.innerHTML = '🔒';
        
        const title = header.createEl('h2', { cls: 'modal-title' });
        title.textContent = this.options.title || this.getDefaultTitle();
        
        const description = header.createEl('p', { cls: 'modal-description' });
        description.textContent = this.options.description || this.getDefaultDescription();

        // Form container
        const form = contentEl.createEl('form', { cls: 'master-password-form' });
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Render fields based on mode
        this.renderFormFields(form);

        // Action buttons - moved inside form for proper submission
        const buttonContainer = form.createEl('div', { cls: 'modal-button-container' });
        
        const cancelButton = buttonContainer.createEl('button', {
            cls: 'btn btn-outline',
            type: 'button'
        });
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => this.close());

        const submitButton = buttonContainer.createEl('button', {
            cls: 'btn btn-primary',
            type: 'submit'
        });
        submitButton.textContent = this.getSubmitButtonText();
        
        // Also add click handler as backup
        submitButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Security notice
        if (this.options.mode !== 'verify') {
            const securityNotice = contentEl.createEl('div', { cls: 'security-notice' });
            securityNotice.innerHTML = `
                <div class="security-notice-icon">🛡️</div>
                <div class="security-notice-content">
                    <strong>Security Note:</strong> Your master password encrypts all API keys and is never stored. 
                    If you forget it, you'll need to re-enter all your API keys.
                </div>
            `;
        }
    }

    private renderFormFields(container: HTMLElement): void {
        switch (this.options.mode) {
            case 'set':
                this.renderSetPasswordFields(container);
                break;
            case 'change':
                this.renderChangePasswordFields(container);
                break;
            case 'verify':
                this.renderVerifyPasswordFields(container);
                break;
        }
    }

    private renderSetPasswordFields(container: HTMLElement): void {
        // New password field
        const newPasswordGroup = container.createEl('div', { cls: 'form-group' });
        const newPasswordLabel = newPasswordGroup.createEl('label', { cls: 'form-label' });
        newPasswordLabel.textContent = 'Master Password';
        
        const newPasswordInput = newPasswordGroup.createEl('input', {
            cls: 'form-input',
            type: 'password',
            attr: { placeholder: 'Enter your master password (min 8 characters)' }
        });
        newPasswordInput.addEventListener('input', (e) => {
            this.newPassword = (e.target as HTMLInputElement).value;
            this.updatePasswordStrength(this.newPassword);
        });

        // Password strength indicator
        const strengthIndicator = newPasswordGroup.createEl('div', { cls: 'password-strength-container' });
        strengthIndicator.style.display = 'none';

        // Confirm password field
        const confirmPasswordGroup = container.createEl('div', { cls: 'form-group' });
        const confirmPasswordLabel = confirmPasswordGroup.createEl('label', { cls: 'form-label' });
        confirmPasswordLabel.textContent = 'Confirm Password';
        
        const confirmPasswordInput = confirmPasswordGroup.createEl('input', {
            cls: 'form-input',
            type: 'password',
            attr: { placeholder: 'Confirm your master password' }
        });
        confirmPasswordInput.addEventListener('input', (e) => {
            this.confirmPassword = (e.target as HTMLInputElement).value;
            this.validatePasswordMatch();
        });

        // Focus first input
        setTimeout(() => newPasswordInput.focus(), 100);
    }

    private renderChangePasswordFields(container: HTMLElement): void {
        // Current password field
        const currentPasswordGroup = container.createEl('div', { cls: 'form-group' });
        const currentPasswordLabel = currentPasswordGroup.createEl('label', { cls: 'form-label' });
        currentPasswordLabel.textContent = 'Current Password';
        
        const currentPasswordInput = currentPasswordGroup.createEl('input', {
            cls: 'form-input',
            type: 'password',
            attr: { placeholder: 'Enter your current master password' }
        });
        currentPasswordInput.addEventListener('input', (e) => {
            this.currentPassword = (e.target as HTMLInputElement).value;
        });

        // Divider
        container.createEl('hr', { cls: 'form-divider' });

        // New password fields (reuse from set mode)
        this.renderSetPasswordFields(container);

        // Focus first input
        setTimeout(() => currentPasswordInput.focus(), 100);
    }

    private renderVerifyPasswordFields(container: HTMLElement): void {
        // Password verification field
        const passwordGroup = container.createEl('div', { cls: 'form-group' });
        const passwordLabel = passwordGroup.createEl('label', { cls: 'form-label' });
        passwordLabel.textContent = 'Master Password';
        
        const passwordInput = passwordGroup.createEl('input', {
            cls: 'form-input',
            type: 'password',
            attr: { placeholder: 'Enter your master password' }
        });
        passwordInput.addEventListener('input', (e) => {
            this.currentPassword = (e.target as HTMLInputElement).value;
        });

        // Focus input
        setTimeout(() => passwordInput.focus(), 100);
    }

    private updatePasswordStrength(password: string): void {
        const container = this.contentEl.querySelector('.password-strength-container') as HTMLElement;
        if (!container) return;

        if (password.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';

        const strength = this.calculatePasswordStrength(password);
        const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength];
        const strengthColors = ['#ff4757', '#ff6348', '#ffa502', '#2ed573', '#5f27cd'];

        container.innerHTML = `
            <div class="password-strength-bar">
                <div class="strength-bar-fill" style="width: ${(strength + 1) * 20}%; background: ${strengthColors[strength]};"></div>
            </div>
            <span class="strength-text" style="color: ${strengthColors[strength]};">${strengthText}</span>
        `;
    }

    private calculatePasswordStrength(password: string): number {
        let score = 0;
        
        // Length bonus
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        
        // Character diversity
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        return Math.min(Math.floor(score / 1.5), 4);
    }

    private validatePasswordMatch(): void {
        const confirmInput = this.contentEl.querySelector('input[type="password"]:last-of-type') as HTMLInputElement;
        if (!confirmInput) return;

        if (this.newPassword && this.confirmPassword && this.newPassword !== this.confirmPassword) {
            confirmInput.style.borderColor = '#ff4757';
            confirmInput.setCustomValidity('Passwords do not match');
        } else {
            confirmInput.style.borderColor = '';
            confirmInput.setCustomValidity('');
        }
    }

    private async handleSubmit(): Promise<void> {
        if (this.isSubmitting) return;

        try {
            this.isSubmitting = true;
            this.updateSubmitButton(true);

            switch (this.options.mode) {
                case 'set':
                    await this.handleSetPassword();
                    break;
                case 'change':
                    await this.handleChangePassword();
                    break;
                case 'verify':
                    await this.handleVerifyPassword();
                    break;
            }
        } catch (error) {
            console.error('Master password operation failed:', error);
            new Notice(error.message || 'Operation failed');
        } finally {
            this.isSubmitting = false;
            this.updateSubmitButton(false);
        }
    }

    private async handleSetPassword(): Promise<void> {
        // Validate inputs
        if (!this.newPassword || this.newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        if (this.newPassword !== this.confirmPassword) {
            throw new Error('Passwords do not match');
        }

        // Set password in KeyManager
        this.keyManager.setMasterPassword(this.newPassword);

        // Generate verification data
        const verificationData = this.keyManager.generatePasswordTest();

        // Call success callback
        await this.options.onSuccess(this.newPassword, verificationData);

        this.wasSuccessful = true;
        new Notice('Master password set successfully!');
        this.close();
    }

    private async handleChangePassword(): Promise<void> {
        // Validate current password
        if (!this.currentPassword) {
            throw new Error('Please enter your current password');
        }

        if (!this.options.existingVerificationData) {
            throw new Error('No existing verification data found');
        }

        // Verify current password
        const isCurrentValid = await this.keyManager.verifyPassword(
            this.currentPassword, 
            this.options.existingVerificationData
        );

        if (!isCurrentValid) {
            throw new Error('Current password is incorrect');
        }

        // Validate new password
        if (!this.newPassword || this.newPassword.length < 8) {
            throw new Error('New password must be at least 8 characters');
        }

        if (this.newPassword !== this.confirmPassword) {
            throw new Error('New passwords do not match');
        }

        // Set new password in KeyManager
        this.keyManager.setMasterPassword(this.newPassword);

        // Generate new verification data
        const verificationData = this.keyManager.generatePasswordTest();

        // Call success callback
        await this.options.onSuccess(this.newPassword, verificationData);

        this.wasSuccessful = true;
        new Notice('Master password changed successfully!');
        this.close();
    }

    private async handleVerifyPassword(): Promise<void> {
        if (!this.currentPassword) {
            throw new Error('Please enter your password');
        }

        if (!this.options.existingVerificationData) {
            throw new Error('No verification data available');
        }

        // Verify password
        const isValid = await this.keyManager.verifyPassword(
            this.currentPassword, 
            this.options.existingVerificationData
        );

        if (!isValid) {
            throw new Error('Password is incorrect');
        }

        // Set password in KeyManager
        this.keyManager.setMasterPassword(this.currentPassword);

        // Call success callback
        await this.options.onSuccess(this.currentPassword);

        this.wasSuccessful = true;
        new Notice('Password verified successfully!');
        this.close();
    }

    private getDefaultTitle(): string {
        switch (this.options.mode) {
            case 'set': return 'Set Master Password';
            case 'change': return 'Change Master Password';
            case 'verify': return 'Enter Master Password';
            default: return 'Master Password';
        }
    }

    private getDefaultDescription(): string {
        switch (this.options.mode) {
            case 'set': return 'Create a master password to encrypt your API keys securely.';
            case 'change': return 'Enter your current password and choose a new one.';
            case 'verify': return 'Enter your master password to access encrypted settings.';
            default: return '';
        }
    }

    private getSubmitButtonText(): string {
        switch (this.options.mode) {
            case 'set': return 'Set Password';
            case 'change': return 'Change Password';
            case 'verify': return 'Verify';
            default: return 'Submit';
        }
    }

    private updateSubmitButton(isLoading: boolean): void {
        const button = this.contentEl.querySelector('.btn-primary') as HTMLButtonElement;
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.textContent = 'Processing...';
        } else {
            button.disabled = false;
            button.textContent = this.getSubmitButtonText();
        }
    }

    private injectStyles(): void {
        // Check if styles are already injected
        if (document.querySelector('#mnemosyne-master-password-styles')) return;

        const style = document.createElement('style');
        style.id = 'mnemosyne-master-password-styles';
        style.textContent = `
            .master-password-header {
                text-align: center;
                margin-bottom: 32px;
            }

            .modal-icon {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.8;
            }

            .modal-title {
                font-size: 24px;
                font-weight: 600;
                color: var(--text-normal);
                margin: 0 0 12px 0;
            }

            .modal-description {
                color: var(--text-muted);
                font-size: 14px;
                line-height: 1.5;
                margin: 0;
                max-width: 400px;
                margin-left: auto;
                margin-right: auto;
            }

            .master-password-form {
                margin-bottom: 24px;
            }

            .form-group {
                margin-bottom: 20px;
            }

            .form-label {
                display: block;
                font-weight: 500;
                color: var(--text-normal);
                margin-bottom: 6px;
                font-size: 14px;
            }

            .form-input {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                background: var(--background-primary);
                color: var(--text-normal);
                font-size: 14px;
                transition: border-color 0.2s ease;
                box-sizing: border-box;
            }

            .form-input:focus {
                outline: none;
                border-color: var(--interactive-accent);
                box-shadow: 0 0 0 2px rgba(123, 108, 217, 0.1);
            }

            .form-input:invalid {
                border-color: #ff4757;
            }

            .form-divider {
                border: none;
                height: 1px;
                background: var(--background-modifier-border);
                margin: 24px 0;
            }

            .password-strength-container {
                margin-top: 8px;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .password-strength-bar {
                flex: 1;
                height: 4px;
                background: var(--background-modifier-border);
                border-radius: 2px;
                overflow: hidden;
            }

            .strength-bar-fill {
                height: 100%;
                transition: width 0.3s ease, background-color 0.3s ease;
                border-radius: 2px;
            }

            .strength-text {
                font-size: 12px;
                font-weight: 500;
                min-width: 80px;
                text-align: right;
            }

            .modal-button-container {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                margin-bottom: 20px;
            }

            .security-notice {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 16px;
                background: rgba(59, 130, 246, 0.05);
                border: 1px solid rgba(59, 130, 246, 0.2);
                border-radius: 8px;
                font-size: 13px;
                line-height: 1.4;
            }

            .security-notice-icon {
                font-size: 18px;
                opacity: 0.8;
                flex-shrink: 0;
            }

            .security-notice-content {
                color: var(--text-muted);
            }

            .security-notice strong {
                color: var(--text-normal);
            }

            /* Button styles */
            .btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 10px 20px;
                font-size: 14px;
                font-weight: 500;
                border-radius: 6px;
                transition: all 0.2s ease;
                cursor: pointer;
                text-decoration: none;
                border: none;
                outline: none;
                min-width: 100px;
                justify-content: center;
            }

            .btn:focus {
                box-shadow: 0 0 0 2px rgba(123, 108, 217, 0.3);
            }

            .btn-primary {
                background: var(--interactive-accent);
                color: var(--text-on-accent);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .btn-primary:hover:not(:disabled) {
                background: var(--interactive-accent-hover);
                transform: translateY(-1px);
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
            }

            .btn-primary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none !important;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .btn-outline {
                background: transparent;
                color: var(--text-muted);
                border: 1px solid var(--background-modifier-border);
            }

            .btn-outline:hover:not(:disabled) {
                background: var(--background-secondary);
                color: var(--text-normal);
                border-color: var(--interactive-hover);
            }
        `;

        document.head.appendChild(style);
    }
}