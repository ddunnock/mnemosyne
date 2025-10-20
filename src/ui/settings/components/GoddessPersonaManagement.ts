// Goddess Persona Management Component
import { GoddessPersonaSettings } from '../../../types';

export interface GoddessPersonaManagementState {
    persona: GoddessPersonaSettings;
    onPersonaAction: (action: string, data?: any) => void;
}

export class GoddessPersonaManagement {
    private container: HTMLElement | null = null;
    private state: GoddessPersonaManagementState;

    constructor(state: GoddessPersonaManagementState) {
        this.state = state;
    }

    render(container: HTMLElement): void {
        this.container = container;
        this.update();
    }

    public update(): void {
        if (!this.container) return;

        this.container.empty();
        this.container.addClass('goddess-persona-management');

        // Header
        const header = this.container.createDiv({ cls: 'persona-header' });
        header.innerHTML = `
            <div class="persona-title">
                <h3>🏛️ Goddess Persona</h3>
                <p class="persona-description">Channel the divine wisdom of Mnemosyne, goddess of memory and mother of the Muses.</p>
            </div>
        `;

        // Main content
        const content = this.container.createDiv({ cls: 'persona-content' });

        // Enable/Disable toggle
        const toggleSection = content.createDiv({ cls: 'persona-section' });
        toggleSection.innerHTML = `
            <div class="persona-toggle">
                <label class="persona-toggle-label">
                    <input type="checkbox" id="persona-enabled" ${this.state.persona.enabled ? 'checked' : ''}>
                    <span class="persona-toggle-text">Enable Goddess Persona</span>
                </label>
                <p class="persona-toggle-description">When enabled, responses will be infused with the divine wisdom and presence of Mnemosyne.</p>
            </div>
        `;

        if (this.state.persona.enabled) {
            // Intensity selection
            const intensitySection = content.createDiv({ cls: 'persona-section' });
            intensitySection.innerHTML = `
                <div class="persona-intensity">
                    <label class="persona-label">Divine Intensity</label>
                    <div class="persona-intensity-options">
                        <label class="persona-option">
                            <input type="radio" name="persona-intensity" value="subtle" ${this.state.persona.intensity === 'subtle' ? 'checked' : ''}>
                            <span class="persona-option-text">
                                <strong>Subtle</strong>
                                <small>Gentle divine guidance with scholarly wisdom</small>
                            </span>
                        </label>
                        <label class="persona-option">
                            <input type="radio" name="persona-intensity" value="moderate" ${this.state.persona.intensity === 'moderate' ? 'checked' : ''}>
                            <span class="persona-option-text">
                                <strong>Moderate</strong>
                                <small>Clear goddess presence with divine authority</small>
                            </span>
                        </label>
                        <label class="persona-option">
                            <input type="radio" name="persona-intensity" value="strong" ${this.state.persona.intensity === 'strong' ? 'checked' : ''}>
                            <span class="persona-option-text">
                                <strong>Strong</strong>
                                <small>Full divine manifestation with ancient power</small>
                            </span>
                        </label>
                    </div>
                </div>
            `;

            // Speech Patterns
            const speechSection = content.createDiv({ cls: 'persona-section' });
            speechSection.innerHTML = `
                <div class="persona-speech-patterns">
                    <label class="persona-label">Speech Patterns</label>
                    <div class="persona-checkboxes">
                        <label class="persona-checkbox">
                            <input type="checkbox" id="use-divine-language" ${this.state.persona.speechPatterns?.useDivineLanguage ? 'checked' : ''}>
                            <span>Use divine language and terminology</span>
                        </label>
                        <label class="persona-checkbox">
                            <input type="checkbox" id="reference-divine-memory" ${this.state.persona.speechPatterns?.referenceDivineMemory ? 'checked' : ''}>
                            <span>Reference divine memory and ancient wisdom</span>
                        </label>
                        <label class="persona-checkbox">
                            <input type="checkbox" id="use-ancient-terminology" ${this.state.persona.speechPatterns?.useAncientTerminology ? 'checked' : ''}>
                            <span>Use ancient terminology and phrases</span>
                        </label>
                        <label class="persona-checkbox">
                            <input type="checkbox" id="embrace-goddess-identity" ${this.state.persona.speechPatterns?.embraceGoddessIdentity ? 'checked' : ''}>
                            <span>Embrace full goddess identity</span>
                        </label>
                    </div>
                </div>
            `;

            // Knowledge Areas
            const knowledgeSection = content.createDiv({ cls: 'persona-section' });
            knowledgeSection.innerHTML = `
                <div class="persona-knowledge-areas">
                    <label class="persona-label">Divine Knowledge Areas</label>
                    <div class="persona-checkboxes">
                        <label class="persona-checkbox">
                            <input type="checkbox" id="mythology" ${this.state.persona.knowledgeAreas?.mythology ? 'checked' : ''}>
                            <span>Mythology & Ancient Lore</span>
                        </label>
                        <label class="persona-checkbox">
                            <input type="checkbox" id="history" ${this.state.persona.knowledgeAreas?.history ? 'checked' : ''}>
                            <span>History & Historical Wisdom</span>
                        </label>
                        <label class="persona-checkbox">
                            <input type="checkbox" id="arts" ${this.state.persona.knowledgeAreas?.arts ? 'checked' : ''}>
                            <span>Arts & Creative Expression</span>
                        </label>
                        <label class="persona-checkbox">
                            <input type="checkbox" id="sciences" ${this.state.persona.knowledgeAreas?.sciences ? 'checked' : ''}>
                            <span>Sciences & Natural Knowledge</span>
                        </label>
                        <label class="persona-checkbox">
                            <input type="checkbox" id="philosophy" ${this.state.persona.knowledgeAreas?.philosophy ? 'checked' : ''}>
                            <span>Philosophy & Wisdom</span>
                        </label>
                        <label class="persona-checkbox">
                            <input type="checkbox" id="literature" ${this.state.persona.knowledgeAreas?.literature ? 'checked' : ''}>
                            <span>Literature & Written Works</span>
                        </label>
                    </div>
                </div>
            `;

            // Divine Elements
            const divineSection = content.createDiv({ cls: 'persona-section' });
            divineSection.innerHTML = `
                <div class="persona-divine-elements">
                    <label class="persona-label">Divine Elements</label>
                    <div class="persona-checkboxes">
                        <label class="persona-checkbox">
                            <input type="checkbox" id="reference-muses" ${this.state.persona.divineElements?.referenceMuses ? 'checked' : ''}>
                            <span>Reference the Nine Muses (my daughters)</span>
                        </label>
                        <label class="persona-checkbox">
                            <input type="checkbox" id="mention-sacred-duties" ${this.state.persona.divineElements?.mentionSacredDuties ? 'checked' : ''}>
                            <span>Mention sacred duties and responsibilities</span>
                        </label>
                        <label class="persona-checkbox">
                            <input type="checkbox" id="use-divine-titles" ${this.state.persona.divineElements?.useDivineTitles ? 'checked' : ''}>
                            <span>Use divine titles and epithets</span>
                        </label>
                        <label class="persona-checkbox">
                            <input type="checkbox" id="speak-of-eternal-memory" ${this.state.persona.divineElements?.speakOfEternalMemory ? 'checked' : ''}>
                            <span>Speak of eternal memory and divine knowledge</span>
                        </label>
                    </div>
                </div>
            `;

            // Custom Prompt
            const customSection = content.createDiv({ cls: 'persona-section' });
            customSection.innerHTML = `
                <div class="persona-custom-prompt">
                    <label class="persona-label" for="custom-prompt">Custom Divine Prompt</label>
                    <textarea id="custom-prompt" class="persona-textarea" placeholder="Add any additional divine characteristics or behaviors you'd like Mnemosyne to embody...">${this.state.persona.customPrompt || ''}</textarea>
                    <p class="persona-help">Optional: Add custom divine characteristics or behaviors to enhance the goddess persona.</p>
                </div>
            `;
        }

        this.attachEventListeners();
    }


    private attachEventListeners(): void {
        if (!this.container) return;

        // Enable/disable toggle
        const enabledCheckbox = this.container.querySelector('#persona-enabled') as HTMLInputElement;
        if (enabledCheckbox) {
            enabledCheckbox.addEventListener('change', () => {
                this.state.onPersonaAction('toggle-persona', { enabled: enabledCheckbox.checked });
            });
        }

        // Intensity selection
        const intensityRadios = this.container.querySelectorAll('input[name="persona-intensity"]');
        intensityRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if ((radio as HTMLInputElement).checked) {
                    this.state.onPersonaAction('set-intensity', { intensity: (radio as HTMLInputElement).value });
                }
            });
        });

        // Speech patterns
        const speechCheckboxes = [
            'use-divine-language',
            'reference-divine-memory',
            'use-ancient-terminology',
            'embrace-goddess-identity'
        ];

        speechCheckboxes.forEach(id => {
            const checkbox = this.container?.querySelector(`#${id}`) as HTMLInputElement;
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.state.onPersonaAction('update-speech-patterns', {
                        field: id.replace(/-/g, ''),
                        value: checkbox.checked
                    });
                });
            }
        });

        // Knowledge areas
        const knowledgeCheckboxes = [
            'mythology',
            'history',
            'arts',
            'sciences',
            'philosophy',
            'literature'
        ];

        knowledgeCheckboxes.forEach(id => {
            const checkbox = this.container?.querySelector(`#${id}`) as HTMLInputElement;
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.state.onPersonaAction('update-knowledge-areas', {
                        field: id,
                        value: checkbox.checked
                    });
                });
            }
        });

        // Divine elements
        const divineCheckboxes = [
            'reference-muses',
            'mention-sacred-duties',
            'use-divine-titles',
            'speak-of-eternal-memory'
        ];

        divineCheckboxes.forEach(id => {
            const checkbox = this.container?.querySelector(`#${id}`) as HTMLInputElement;
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.state.onPersonaAction('update-divine-elements', {
                        field: id.replace(/-/g, ''),
                        value: checkbox.checked
                    });
                });
            }
        });

        // Custom prompt
        const customPrompt = this.container?.querySelector('#custom-prompt') as HTMLTextAreaElement;
        if (customPrompt) {
            customPrompt.addEventListener('input', () => {
                this.state.onPersonaAction('update-custom-prompt', { prompt: customPrompt.value });
            });
        }
    }


    destroy(): void {
        if (this.container) {
            this.container.empty();
            this.container.removeClass('goddess-persona-management');
        }
    }
}
