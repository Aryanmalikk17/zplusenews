/**
 * Transcription Service (Free)
 * Fetches YouTube's auto-generated captions directly — no API key needed
 * Uses the youtube-transcript package
 */

import { YoutubeTranscript } from 'youtube-transcript';
import Video from '../models/Video.js';

/**
 * Fetch transcript from YouTube's auto-generated captions
 * @param {string} videoId - YouTube video ID
 * @returns {string} Full transcript text
 */
async function fetchTranscript(videoId) {
    console.log(`[Transcription] Fetching captions for video: ${videoId}`);

    try {
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
            lang: 'en',
        });

        if (!transcriptItems || transcriptItems.length === 0) {
            throw new Error('No captions available for this video');
        }

        // Combine all caption segments into full text
        const fullText = transcriptItems
            .map(item => item.text)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

        console.log(`[Transcription] Success! Length: ${fullText.length} chars, Segments: ${transcriptItems.length}`);
        return fullText;

    } catch (error) {
        // Try without language specification as fallback
        if (error.message?.includes('No captions')) {
            console.log('[Transcription] No English captions, trying any available language...');
            try {
                const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
                if (transcriptItems && transcriptItems.length > 0) {
                    const fullText = transcriptItems
                        .map(item => item.text)
                        .join(' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    console.log(`[Transcription] Got captions in alternate language. Length: ${fullText.length}`);
                    return fullText;
                }
            } catch {
                // Fall through to error
            }
        }

        console.error('[Transcription] Failed:', error.message);
        throw new Error(`Could not fetch captions: ${error.message}. Make sure the video has captions/subtitles enabled.`);
    }
}

/**
 * Format raw transcript into article-style content with paragraphs
 * @param {string} transcript - Raw transcript text
 * @param {string} title - Video title for context
 * @returns {string} Formatted article content as HTML
 */
function formatAsArticle(transcript, title) {
    if (!transcript) return '';

    // Clean up common caption artifacts
    let cleaned = transcript
        .replace(/\[.*?\]/g, '')           // Remove [Music], [Applause], etc.
        .replace(/\(.*?\)/g, '')           // Remove (inaudible), etc.
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();

    // Split into sentences
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    const paragraphs = [];
    let currentParagraph = [];

    for (const sentence of sentences) {
        currentParagraph.push(sentence);
        // Group ~4 sentences per paragraph
        if (currentParagraph.length >= 4) {
            paragraphs.push(`<p>${currentParagraph.join(' ')}</p>`);
            currentParagraph = [];
        }
    }

    // Add remaining sentences
    if (currentParagraph.length > 0) {
        paragraphs.push(`<p>${currentParagraph.join(' ')}</p>`);
    }

    // If no sentence breaks were found, create paragraphs by word count
    if (paragraphs.length <= 1 && cleaned.length > 200) {
        const words = cleaned.split(' ');
        const newParagraphs = [];
        for (let i = 0; i < words.length; i += 60) {
            const chunk = words.slice(i, i + 60).join(' ');
            newParagraphs.push(`<p>${chunk}</p>`);
        }
        return newParagraphs.join('\n');
    }

    return paragraphs.join('\n');
}

export {
    fetchTranscript,
    formatAsArticle,
};
