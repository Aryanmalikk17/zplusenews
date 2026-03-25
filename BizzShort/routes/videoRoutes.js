/**
 * Video Routes
 * API endpoints for video management and YouTube integration
 */
const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const { fetchVideoDetails } = require('../services/youtubeService');
const { fetchTranscript, formatAsArticle } = require('../services/transcriptionService');

/**
 * POST /api/videos/add-by-id
 * Add a video by YouTube ID - fetches metadata from YouTube API
 * Body: { videoId: string, category?: string }
 */
router.post('/add-by-id', async (req, res) => {
    try {
        const { videoId, category } = req.body;

        if (!videoId) {
            return res.status(400).json({ success: false, error: 'videoId is required' });
        }

        // Clean the video ID (handle full URLs)
        const cleanId = extractVideoId(videoId);
        if (!cleanId) {
            return res.status(400).json({ success: false, error: 'Invalid YouTube video ID or URL' });
        }

        // Check if video already exists
        const existing = await Video.findOne({ videoId: cleanId });
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Video already exists',
                video: existing,
            });
        }

        // Fetch video details from YouTube API
        const details = await fetchVideoDetails(cleanId);

        // Create the video record
        const video = await Video.create({
            title: details.title,
            category: category || 'general',
            source: 'youtube',
            videoId: cleanId,
            thumbnail: details.thumbnail,
            description: details.description,
            views: details.views,
            date: new Date(details.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }),
            duration: details.duration,
            tags: details.tags.slice(0, 10),
            youtubeChannelTitle: details.channelTitle,
        });

        res.status(201).json({ success: true, video });
    } catch (error) {
        console.error('[VideoRoutes] add-by-id error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/videos/:id/transcribe
 * Trigger transcription for an existing video
 */
router.post('/:id/transcribe', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({ success: false, error: 'Video not found' });
        }

        if (video.source !== 'youtube') {
            return res.status(400).json({ success: false, error: 'Transcription only supported for YouTube videos' });
        }

        // Check if already transcribed
        if (video.transcript && video.transcript.length > 0) {
            return res.json({
                success: true,
                message: 'Video already transcribed',
                video,
            });
        }

        // Fetch captions from YouTube (free)
        const transcript = await fetchTranscript(video.videoId);

        // Format as article
        const articleContent = formatAsArticle(transcript, video.title);

        // Update the video record
        video.transcript = transcript;
        video.articleContent = articleContent;
        video.updatedAt = Date.now();
        await video.save();

        res.json({ success: true, video });
    } catch (error) {
        console.error('[VideoRoutes] transcribe error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Extract YouTube Video ID from various URL formats or plain ID
 * @param {string} input - YouTube URL or video ID
 * @returns {string|null} Video ID or null
 */
function extractVideoId(input) {
    if (!input) return null;

    // Already a plain video ID (11 chars alphanumeric + _-)
    if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
        return input.trim();
    }

    // Try various URL patterns
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return null;
}

/**
 * GET /api/videos/by-video-id/:videoId
 * Look up a video by its YouTube video ID (for frontend Article page)
 */
router.get('/by-video-id/:videoId', async (req, res) => {
    try {
        const video = await Video.findOne({ videoId: req.params.videoId });
        if (!video) {
            return res.status(404).json({ success: false, error: 'Video not found' });
        }
        res.json(video);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/videos/sync-channel
 * Import all videos from a YouTube channel
 * Body: { channelHandle?: string, category?: string }
 */
router.post('/sync-channel', async (req, res) => {
    try {
        const { resolveChannelId, fetchChannelVideoIds, fetchMultipleVideoDetails } = require('../services/youtubeService');

        const channelHandle = req.body.channelHandle || process.env.YOUTUBE_CHANNEL_HANDLE || '@zplusenews';
        const defaultCategory = req.body.category || 'general';

        console.log(`[Sync] Starting channel sync for: ${channelHandle}`);

        // Step 1: Resolve channel ID (use env var if available to save an API call)
        let channelId = process.env.YOUTUBE_CHANNEL_ID;
        if (!channelId) {
            channelId = await resolveChannelId(channelHandle);
        }
        console.log(`[Sync] Resolved channel ID: ${channelId}`);

        // Step 2: Get all video IDs from channel
        const videoIds = await fetchChannelVideoIds(channelId);
        console.log(`[Sync] Found ${videoIds.length} videos`);

        // Step 3: Filter out already-imported videos
        const existingVideos = await Video.find(
            { videoId: { $in: videoIds } },
            { videoId: 1 }
        );
        const existingIds = new Set(existingVideos.map(v => v.videoId));
        const newVideoIds = videoIds.filter(id => !existingIds.has(id));

        console.log(`[Sync] ${existingIds.size} already imported, ${newVideoIds.length} new`);

        if (newVideoIds.length === 0) {
            return res.json({
                success: true,
                message: 'All videos already imported',
                total: videoIds.length,
                imported: 0,
                skipped: existingIds.size,
            });
        }

        // Step 4: Fetch details for new videos (batched)
        const videoDetails = await fetchMultipleVideoDetails(newVideoIds);

        // Step 5: Save to database
        const savedVideos = [];
        for (const details of videoDetails) {
            try {
                const video = await Video.create({
                    title: details.title,
                    category: defaultCategory,
                    source: 'youtube',
                    videoId: details.videoId,
                    thumbnail: details.thumbnail,
                    description: details.description,
                    views: details.views,
                    date: new Date(details.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    }),
                    duration: details.duration,
                    tags: (details.tags || []).slice(0, 10),
                    youtubeChannelTitle: details.channelTitle,
                });
                savedVideos.push(video);
            } catch (saveError) {
                console.warn(`[Sync] Failed to save video ${details.videoId}:`, saveError.message);
            }
        }

        console.log(`[Sync] Complete! Imported ${savedVideos.length} new videos`);

        res.json({
            success: true,
            message: `Imported ${savedVideos.length} new videos from channel`,
            total: videoIds.length,
            imported: savedVideos.length,
            skipped: existingIds.size,
            videos: savedVideos,
        });
    } catch (error) {
        console.error('[VideoRoutes] sync-channel error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/videos/transcribe-all
 * Batch transcribe all videos that don't have transcripts yet
 */
router.post('/transcribe-all', async (req, res) => {
    try {
        const videos = await Video.find({
            source: 'youtube',
            $or: [
                { transcript: { $exists: false } },
                { transcript: '' },
                { transcript: null },
            ]
        });

        console.log(`[TranscribeAll] Found ${videos.length} videos without transcripts`);

        const results = { success: 0, failed: 0, errors: [] };

        for (const video of videos) {
            try {
                const transcript = await fetchTranscript(video.videoId);
                const articleContent = formatAsArticle(transcript, video.title);
                video.transcript = transcript;
                video.articleContent = articleContent;
                video.updatedAt = Date.now();
                await video.save();
                results.success++;
                console.log(`[TranscribeAll] ✅ ${video.title}`);
            } catch (err) {
                results.failed++;
                results.errors.push({ videoId: video.videoId, title: video.title, error: err.message });
                console.log(`[TranscribeAll] ❌ ${video.title}: ${err.message}`);
            }
        }

        res.json({
            success: true,
            message: `Transcribed ${results.success} videos, ${results.failed} failed`,
            ...results,
        });
    } catch (error) {
        console.error('[VideoRoutes] transcribe-all error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

