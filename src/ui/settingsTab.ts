/**
 * Settings Tab - Modern UI Implementation with SettingsController
 *
 * Uses the new SettingsController for a modern, unified settings experience
 */

import { App, PluginSettingTab } from 'obsidian';
import { MnemosyneSettingsController } from './settings/SettingsController';

export class MnemosyneSettingTab extends PluginSettingTab {
    plugin: any;
    private settingsController: MnemosyneSettingsController | null = null;

    constructor(app: App, plugin: any) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async display(): Promise<void> {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('mnemosyne-settings');

        // Initialize settings controller
        if (!this.settingsController) {
            this.settingsController = new MnemosyneSettingsController(this.plugin);
            // Set reference in plugin for other components to access
            this.plugin.settingsController = this.settingsController;
        }

        // Render the modern settings UI
        await this.settingsController.render(containerEl);
    }

    hide(): void {
        // Cleanup when settings tab is hidden
        if (this.settingsController) {
            this.settingsController.destroy();
        }
        super.hide();
    }
}
