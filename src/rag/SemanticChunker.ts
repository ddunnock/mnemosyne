/**
 * Semantic Chunker
 *
 * Advanced chunking strategies that respect document structure
 * for optimal RAG retrieval
 */

import { TFile } from 'obsidian';
import { ChunkMetadata, RAGChunk } from '../types';

export interface ChunkingConfig {
    maxChunkSize: number;
    minChunkSize: number;
    overlapSize: number;
    respectBoundaries: boolean;
}

interface MarkdownSection {
    level: number;
    title: string;
    content: string;
    startLine: number;
    endLine: number;
    parentTitle?: string;
}

export class SemanticChunker {
    private config: ChunkingConfig;

    constructor(config: Partial<ChunkingConfig> = {}) {
        this.config = {
            maxChunkSize: config.maxChunkSize || 1000,
            minChunkSize: config.minChunkSize || 200,
            overlapSize: config.overlapSize || 200,
            respectBoundaries: config.respectBoundaries !== false
        };
    }

    /**
     * Create semantically meaningful chunks from markdown content
     */
    createChunks(file: TFile, content: string): RAGChunk[] {
        const chunks: RAGChunk[] = [];

        // Extract frontmatter and body
        const { frontmatter, body } = this.parseFrontmatter(content);

        // Parse markdown structure
        const sections = this.parseMarkdownSections(body);

        // Extract tags from frontmatter and content
        const tags = this.extractTags(frontmatter, body);

        // Extract links
        const links = this.extractLinks(body);

        // Create chunks respecting markdown structure
        if (this.config.respectBoundaries && sections.length > 0) {
            // Chunk by sections with smart splitting
            for (const section of sections) {
                const sectionChunks = this.chunkSection(
                    file,
                    section,
                    frontmatter,
                    tags,
                    links
                );
                chunks.push(...sectionChunks);
            }
        } else {
            // Fallback to simple chunking
            const simpleChunks = this.simpleChunk(file, body, frontmatter, tags, links);
            chunks.push(...simpleChunks);
        }

        return chunks;
    }

    /**
     * Parse frontmatter from markdown content
     */
    private parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

        if (!frontmatterMatch) {
            return { frontmatter: {}, body: content };
        }

        const frontmatterText = frontmatterMatch[1];
        const body = frontmatterMatch[2];

        // Simple YAML parsing (basic key: value)
        const frontmatter: Record<string, any> = {};
        const lines = frontmatterText.split('\n');

        for (const line of lines) {
            const match = line.match(/^(\w+):\s*(.+)$/);
            if (match) {
                const key = match[1];
                let value: any = match[2].trim();

                // Parse arrays
                if (value.startsWith('[') && value.endsWith(']')) {
                    value = value.slice(1, -1).split(',').map((v: string) => v.trim());
                }

                frontmatter[key] = value;
            }
        }

        return { frontmatter, body };
    }

    /**
     * Parse markdown into hierarchical sections
     */
    private parseMarkdownSections(content: string): MarkdownSection[] {
        const sections: MarkdownSection[] = [];
        const lines = content.split('\n');

        let currentSection: MarkdownSection | null = null;
        const sectionStack: MarkdownSection[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

            if (headingMatch) {
                // Save previous section
                if (currentSection) {
                    currentSection.endLine = i - 1;
                    sections.push(currentSection);
                }

                const level = headingMatch[1].length;
                const title = headingMatch[2].trim();

                // Find parent section
                while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level >= level) {
                    sectionStack.pop();
                }

                const parentTitle = sectionStack.length > 0 ? sectionStack[sectionStack.length - 1].title : undefined;

                currentSection = {
                    level,
                    title,
                    content: '',
                    startLine: i,
                    endLine: i,
                    parentTitle
                };

                sectionStack.push(currentSection);
            } else if (currentSection) {
                currentSection.content += line + '\n';
            }
        }

        // Save last section
        if (currentSection) {
            currentSection.endLine = lines.length - 1;
            sections.push(currentSection);
        }

        return sections;
    }

    /**
     * Chunk a single section intelligently
     */
    private chunkSection(
        file: TFile,
        section: MarkdownSection,
        frontmatter: Record<string, any>,
        fileTags: string[],
        fileLinks: string[]
    ): RAGChunk[] {
        const chunks: RAGChunk[] = [];
        const sectionContent = section.content.trim();

        // Skip empty sections
        if (sectionContent.length === 0) {
            return chunks;
        }

        // If section is small enough, keep as single chunk
        if (sectionContent.length <= this.config.maxChunkSize) {
            const chunk = this.createChunk(
                file,
                0,
                sectionContent,
                section.title,
                section,
                frontmatter,
                fileTags,
                fileLinks
            );
            chunks.push(chunk);
            return chunks;
        }

        // Split large section into smaller chunks
        const subChunks = this.splitLargeSection(sectionContent);

        for (let i = 0; i < subChunks.length; i++) {
            const chunk = this.createChunk(
                file,
                i,
                subChunks[i],
                section.title,
                section,
                frontmatter,
                fileTags,
                fileLinks
            );
            chunks.push(chunk);
        }

        return chunks;
    }

    /**
     * Split large section into smaller chunks respecting paragraph boundaries
     */
    private splitLargeSection(content: string): string[] {
        const chunks: string[] = [];
        const paragraphs = content.split(/\n\n+/);

        let currentChunk = '';

        for (const paragraph of paragraphs) {
            const trimmedParagraph = paragraph.trim();
            if (!trimmedParagraph) continue;

            // If adding this paragraph exceeds max size, save current and start new
            if (currentChunk.length + trimmedParagraph.length > this.config.maxChunkSize) {
                if (currentChunk.length >= this.config.minChunkSize) {
                    chunks.push(currentChunk.trim());
                    // Add overlap from end of previous chunk
                    const overlap = this.getOverlap(currentChunk);
                    currentChunk = overlap + '\n\n' + trimmedParagraph;
                } else {
                    // Current chunk is too small, just add the paragraph
                    currentChunk += '\n\n' + trimmedParagraph;
                }
            } else {
                if (currentChunk) {
                    currentChunk += '\n\n' + trimmedParagraph;
                } else {
                    currentChunk = trimmedParagraph;
                }
            }
        }

        // Add final chunk
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    /**
     * Get overlap text from end of chunk
     */
    private getOverlap(text: string): string {
        if (text.length <= this.config.overlapSize) {
            return text;
        }

        // Get last N characters, but try to break at sentence boundary
        const overlapText = text.slice(-this.config.overlapSize);
        const sentenceMatch = overlapText.match(/[.!?]\s+(.+)$/s);

        if (sentenceMatch) {
            return sentenceMatch[1];
        }

        return overlapText;
    }

    /**
     * Create a chunk with rich metadata
     */
    private createChunk(
        file: TFile,
        chunkIndex: number,
        content: string,
        sectionTitle: string,
        section: MarkdownSection,
        frontmatter: Record<string, any>,
        fileTags: string[],
        fileLinks: string[]
    ): RAGChunk {
        // Build heading hierarchy breadcrumb
        const breadcrumb = section.parentTitle
            ? `${section.parentTitle} > ${sectionTitle}`
            : sectionTitle;

        // Extract chunk-specific information
        const chunkLinks = this.extractLinks(content);
        const chunkCodeBlocks = this.extractCodeBlocks(content);
        const chunkKeywords = this.extractKeywordsTFIDF(content);

        const metadata: ChunkMetadata = {
            document_id: file.path,
            document_title: file.basename,
            section: `${sectionTitle}_${chunkIndex}`,
            section_title: sectionTitle,
            content_type: 'markdown',
            page_reference: `${file.basename}#${this.slugify(sectionTitle)}`,

            // File stats
            created: file.stat.ctime,
            modified: file.stat.mtime,
            size: file.stat.size,

            // Enhanced metadata
            tags: fileTags,
            links: chunkLinks,
            keywords: chunkKeywords,
            heading_level: section.level,
            heading_hierarchy: breadcrumb,
            parent_heading: section.parentTitle,
            chunk_index: chunkIndex,

            // Code block information
            has_code: chunkCodeBlocks.length > 0,
            code_languages: chunkCodeBlocks.map(cb => cb.language).filter(Boolean),

            // Frontmatter data
            ...this.extractFrontmatterMetadata(frontmatter)
        };

        return {
            chunk_id: `${file.path}_${this.slugify(sectionTitle)}_${chunkIndex}`,
            content,
            metadata
        };
    }

    /**
     * Simple chunking fallback
     */
    private simpleChunk(
        file: TFile,
        content: string,
        frontmatter: Record<string, any>,
        tags: string[],
        links: string[]
    ): RAGChunk[] {
        const chunks: RAGChunk[] = [];
        const paragraphs = content.split(/\n\n+/);

        let currentChunk = '';
        let chunkIndex = 0;

        for (const paragraph of paragraphs) {
            const trimmedParagraph = paragraph.trim();
            if (!trimmedParagraph) continue;

            if (currentChunk.length + trimmedParagraph.length > this.config.maxChunkSize) {
                if (currentChunk.length >= this.config.minChunkSize) {
                    const chunk = this.createSimpleChunk(
                        file,
                        chunkIndex++,
                        currentChunk.trim(),
                        frontmatter,
                        tags,
                        links
                    );
                    chunks.push(chunk);

                    const overlap = this.getOverlap(currentChunk);
                    currentChunk = overlap + '\n\n' + trimmedParagraph;
                } else {
                    currentChunk += '\n\n' + trimmedParagraph;
                }
            } else {
                if (currentChunk) {
                    currentChunk += '\n\n' + trimmedParagraph;
                } else {
                    currentChunk = trimmedParagraph;
                }
            }
        }

        if (currentChunk.trim()) {
            const chunk = this.createSimpleChunk(
                file,
                chunkIndex,
                currentChunk.trim(),
                frontmatter,
                tags,
                links
            );
            chunks.push(chunk);
        }

        return chunks;
    }

    /**
     * Create a simple chunk without section info
     */
    private createSimpleChunk(
        file: TFile,
        chunkIndex: number,
        content: string,
        frontmatter: Record<string, any>,
        tags: string[],
        links: string[]
    ): RAGChunk {
        const firstHeading = this.extractFirstHeading(content);
        const keywords = this.extractKeywordsTFIDF(content);
        const chunkLinks = this.extractLinks(content);
        const codeBlocks = this.extractCodeBlocks(content);

        const metadata: ChunkMetadata = {
            document_id: file.path,
            document_title: file.basename,
            section: `chunk_${chunkIndex}`,
            section_title: firstHeading,
            content_type: 'markdown',
            page_reference: `${file.basename}#chunk_${chunkIndex}`,

            created: file.stat.ctime,
            modified: file.stat.mtime,
            size: file.stat.size,

            tags,
            links: chunkLinks,
            keywords,
            chunk_index: chunkIndex,
            has_code: codeBlocks.length > 0,
            code_languages: codeBlocks.map(cb => cb.language).filter(Boolean),

            ...this.extractFrontmatterMetadata(frontmatter)
        };

        return {
            chunk_id: `${file.path}_chunk_${chunkIndex}`,
            content,
            metadata
        };
    }

    /**
     * Extract tags from frontmatter and content
     */
    private extractTags(frontmatter: Record<string, any>, content: string): string[] {
        const tags = new Set<string>();

        // From frontmatter
        if (frontmatter.tags) {
            const fmTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags];
            fmTags.forEach(tag => tags.add(String(tag).replace(/^#/, '')));
        }

        // From content (#hashtags)
        const hashtagMatches = content.matchAll(/#([a-zA-Z0-9_/-]+)/g);
        for (const match of hashtagMatches) {
            tags.add(match[1]);
        }

        return Array.from(tags);
    }

    /**
     * Extract internal and external links
     */
    private extractLinks(content: string): string[] {
        const links = new Set<string>();

        // Internal wiki links [[Page]] or [[Page|Alias]]
        const wikiLinkMatches = content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
        for (const match of wikiLinkMatches) {
            links.add(match[1]);
        }

        // Markdown links [text](url)
        const mdLinkMatches = content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
        for (const match of mdLinkMatches) {
            links.add(match[2]);
        }

        return Array.from(links);
    }

    /**
     * Extract code blocks with language info
     */
    private extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
        const codeBlocks: Array<{ language: string; code: string }> = [];
        const matches = content.matchAll(/```(\w+)?\n([\s\S]*?)```/g);

        for (const match of matches) {
            codeBlocks.push({
                language: match[1] || 'text',
                code: match[2]
            });
        }

        return codeBlocks;
    }

    /**
     * Extract first heading from content
     */
    private extractFirstHeading(content: string): string | undefined {
        const headingMatch = content.match(/^#+\s+(.+)$/m);
        return headingMatch ? headingMatch[1].trim() : undefined;
    }

    /**
     * Extract keywords using TF-IDF approach
     */
    private extractKeywordsTFIDF(content: string): string[] {
        // Common English stopwords
        const stopwords = new Set([
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
            'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
            'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
            'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
            'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
            'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
            'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
            'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
            'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
            'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
        ]);

        // Clean and tokenize
        const words = content
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word =>
                word.length > 3 &&
                !stopwords.has(word) &&
                !/^\d+$/.test(word) // Remove pure numbers
            );

        // Count word frequencies
        const wordCount = new Map<string, number>();
        words.forEach(word => {
            wordCount.set(word, (wordCount.get(word) || 0) + 1);
        });

        // Sort by frequency and return top keywords
        return Array.from(wordCount.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 15)
            .map(([word]) => word);
    }

    /**
     * Extract relevant metadata from frontmatter
     */
    private extractFrontmatterMetadata(frontmatter: Record<string, any>): Record<string, any> {
        const metadata: Record<string, any> = {};

        // Common frontmatter fields that are useful for RAG
        const relevantFields = [
            'author', 'date', 'category', 'categories',
            'type', 'status', 'priority', 'project',
            'aliases', 'cssclass'
        ];

        for (const field of relevantFields) {
            if (frontmatter[field] !== undefined) {
                metadata[field] = frontmatter[field];
            }
        }

        return metadata;
    }

    /**
     * Convert text to URL-safe slug
     */
    private slugify(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
}
