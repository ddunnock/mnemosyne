/**
 * Test Utility for Discovering L3Harris Embedding Models
 *
 * Helps identify which embedding models/deployments are available
 * on your L3Harris Azure OpenAI endpoint
 */

import { requestUrl } from 'obsidian';

export interface EmbeddingTestResult {
    deploymentName: string;
    success: boolean;
    dimension?: number;
    error?: string;
    responseTime?: number;
}

/**
 * Test a specific embedding deployment
 */
async function testEmbeddingDeployment(
    baseUrl: string,
    apiKey: string,
    deploymentName: string,
    apiVersion: string = '2024-06-01'
): Promise<EmbeddingTestResult> {
    const startTime = Date.now();

    try {
        const url = `${baseUrl}/cgp/openai/deployments/${deploymentName}/embeddings?api-version=${apiVersion}`;

        console.log(`[EmbeddingTest] Testing deployment: ${deploymentName}`);
        console.log(`[EmbeddingTest] URL: ${url}`);

        const response = await requestUrl({
            url: url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey,
            },
            body: JSON.stringify({
                input: 'test embedding',
            }),
            throw: false,
        });

        const responseTime = Date.now() - startTime;

        console.log(`[EmbeddingTest] Response status: ${response.status}`);

        if (response.status === 200) {
            const data = JSON.parse(response.text);
            const embedding = data.data?.[0]?.embedding;

            if (embedding && Array.isArray(embedding)) {
                return {
                    deploymentName,
                    success: true,
                    dimension: embedding.length,
                    responseTime,
                };
            }
        }

        // Non-200 response
        let errorMsg = `HTTP ${response.status}`;
        try {
            const errorData = JSON.parse(response.text);
            errorMsg = errorData.error?.message || errorMsg;
        } catch (e) {
            // Ignore JSON parse errors
        }

        return {
            deploymentName,
            success: false,
            error: errorMsg,
            responseTime,
        };

    } catch (error: any) {
        const responseTime = Date.now() - startTime;
        console.error(`[EmbeddingTest] Error testing ${deploymentName}:`, error);

        return {
            deploymentName,
            success: false,
            error: error.message || 'Unknown error',
            responseTime,
        };
    }
}

/**
 * Test multiple common embedding deployment names
 */
export async function discoverEmbeddingModels(
    baseUrl: string,
    apiKey: string
): Promise<EmbeddingTestResult[]> {
    console.log('=== Starting Embedding Model Discovery ===');
    console.log(`Base URL: ${baseUrl}`);
    console.log(`API Key: ${apiKey.substring(0, 8)}...`);

    // Common deployment names used in Azure OpenAI
    const deploymentsToTest = [
        // Standard OpenAI model names
        'text-embedding-ada-002',
        'text-embedding-3-small',
        'text-embedding-3-large',

        // Generic deployment names
        'embeddings',
        'embedding',
        'text-embedding',

        // Model-specific but might be deployment names
        'ada-002',
        'ada',

        // Sometimes organizations use simple names
        'embed',
        'vector',

        // L3Harris might use custom names
        'lhx-embedding',
        'gpt-embedding',
    ];

    const results: EmbeddingTestResult[] = [];

    for (const deployment of deploymentsToTest) {
        const result = await testEmbeddingDeployment(baseUrl, apiKey, deployment);
        results.push(result);

        // Add a small delay between tests to be respectful
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('=== Embedding Model Discovery Complete ===');

    // Log summary
    const successful = results.filter(r => r.success);
    console.log(`\nFound ${successful.length} working embedding deployment(s):`);
    successful.forEach(r => {
        console.log(`  ✓ ${r.deploymentName} (${r.dimension} dimensions, ${r.responseTime}ms)`);
    });

    if (successful.length === 0) {
        console.log('\n⚠️ No working embeddings deployments found.');
        console.log('This could mean:');
        console.log('1. The deployment name is not in our test list');
        console.log('2. Embeddings are not enabled on your L3Harris endpoint');
        console.log('3. Different api-version is required');
        console.log('\nCheck with your IT department for the correct deployment name.');
    }

    return results;
}

/**
 * Test a specific deployment name provided by user
 */
export async function testSpecificEmbedding(
    baseUrl: string,
    apiKey: string,
    deploymentName: string
): Promise<EmbeddingTestResult> {
    console.log(`=== Testing Specific Embedding Deployment: ${deploymentName} ===`);

    const result = await testEmbeddingDeployment(baseUrl, apiKey, deploymentName);

    if (result.success) {
        console.log(`✓ Success! Model: ${deploymentName}`);
        console.log(`  - Dimension: ${result.dimension}`);
        console.log(`  - Response Time: ${result.responseTime}ms`);
    } else {
        console.log(`✗ Failed: ${result.error}`);
    }

    return result;
}
