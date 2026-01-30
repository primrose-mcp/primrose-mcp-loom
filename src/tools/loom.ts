/**
 * Loom Tools
 *
 * MCP tools for Loom video management.
 * All tools are prefixed with 'loom_'.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { LoomClient } from '../client.js';
import { formatError } from '../utils/errors.js';

/**
 * Register all Loom-related tools
 *
 * @param server - MCP server instance
 * @param client - Loom client instance
 */
export function registerLoomTools(server: McpServer, client: LoomClient): void {
  // ===========================================================================
  // User Tools
  // ===========================================================================

  server.tool(
    'loom_get_current_user',
    `Get the current authenticated user's information.

Returns:
  User object with id, email, name, and avatar URL.`,
    {},
    async () => {
      try {
        const user = await client.getCurrentUser();
        return {
          content: [{ type: 'text', text: JSON.stringify(user, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  // ===========================================================================
  // Video Tools
  // ===========================================================================

  server.tool(
    'loom_list_videos',
    `List videos from the user's Loom account with pagination.

Args:
  - perPage: Number of videos to return per page (default: 20)
  - nextCursor: Pagination cursor from previous response

Returns:
  Paginated list of videos with id, title, status, duration, URLs, and metadata.`,
    {
      perPage: z.number().int().min(1).max(100).optional().describe('Number of videos per page'),
      nextCursor: z.string().optional().describe('Pagination cursor from previous response'),
    },
    async ({ perPage, nextCursor }) => {
      try {
        const result = await client.listVideos({ perPage, nextCursor });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_get_video',
    `Get detailed information about a specific video.

Args:
  - videoId: The Loom video ID

Returns:
  Complete video object with all metadata including embed URL, share URL, owner info.`,
    {
      videoId: z.string().describe('The Loom video ID'),
    },
    async ({ videoId }) => {
      try {
        const video = await client.getVideo(videoId);
        return {
          content: [{ type: 'text', text: JSON.stringify(video, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_update_video',
    `Update a video's title, description, or privacy settings.

Args:
  - videoId: The Loom video ID
  - title: New title for the video
  - description: New description for the video
  - privacy: Privacy setting (public, private, company, password)

Returns:
  Updated video ID.`,
    {
      videoId: z.string().describe('The Loom video ID'),
      title: z.string().optional().describe('New video title'),
      description: z.string().optional().describe('New video description'),
      privacy: z
        .enum(['public', 'private', 'company', 'password'])
        .optional()
        .describe('Privacy setting'),
    },
    async ({ videoId, title, description, privacy }) => {
      try {
        const result = await client.updateVideo(videoId, { title, description, privacy });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Video updated', ...result }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_delete_video',
    `Delete a video from Loom.

Args:
  - videoId: The Loom video ID to delete

Returns:
  Confirmation of deletion.`,
    {
      videoId: z.string().describe('The Loom video ID to delete'),
    },
    async ({ videoId }) => {
      try {
        await client.deleteVideo(videoId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Video ${videoId} deleted` }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_search_videos',
    `Search for videos by query string.

Args:
  - query: Search query string
  - perPage: Number of results per page
  - nextCursor: Pagination cursor

Returns:
  Paginated list of matching videos.`,
    {
      query: z.string().describe('Search query'),
      perPage: z.number().int().min(1).max(100).optional().describe('Results per page'),
      nextCursor: z.string().optional().describe('Pagination cursor'),
    },
    async ({ query, perPage, nextCursor }) => {
      try {
        const result = await client.searchVideos(query, { perPage, nextCursor });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_move_video_to_folder',
    `Move a video to a specific folder.

Args:
  - videoId: The Loom video ID
  - folderId: The target folder ID

Returns:
  Confirmation of move.`,
    {
      videoId: z.string().describe('The video ID to move'),
      folderId: z.string().describe('The target folder ID'),
    },
    async ({ videoId, folderId }) => {
      try {
        await client.moveVideoToFolder(videoId, folderId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: `Video moved to folder ${folderId}` },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_duplicate_video',
    `Create a duplicate copy of a video.

Args:
  - videoId: The Loom video ID to duplicate

Returns:
  The new duplicated video object.`,
    {
      videoId: z.string().describe('The video ID to duplicate'),
    },
    async ({ videoId }) => {
      try {
        const video = await client.duplicateVideo(videoId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Video duplicated', video }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  // ===========================================================================
  // Transcript Tools
  // ===========================================================================

  server.tool(
    'loom_get_transcript',
    `Get the transcript for a video with timestamps.

Args:
  - videoId: The Loom video ID

Returns:
  Transcript with segments (startTime, endTime, text) and full text.`,
    {
      videoId: z.string().describe('The Loom video ID'),
    },
    async ({ videoId }) => {
      try {
        const transcript = await client.getTranscript(videoId);
        return {
          content: [{ type: 'text', text: JSON.stringify(transcript, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  // ===========================================================================
  // Analytics Tools
  // ===========================================================================

  server.tool(
    'loom_get_video_analytics',
    `Get analytics data for a video.

Args:
  - videoId: The Loom video ID

Returns:
  Analytics with totalViews, uniqueViewers, averagePercentWatched, totalWatchTime.`,
    {
      videoId: z.string().describe('The Loom video ID'),
    },
    async ({ videoId }) => {
      try {
        const analytics = await client.getVideoAnalytics(videoId);
        return {
          content: [{ type: 'text', text: JSON.stringify(analytics, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  // ===========================================================================
  // Comment Tools
  // ===========================================================================

  server.tool(
    'loom_list_comments',
    `List all comments on a video.

Args:
  - videoId: The Loom video ID

Returns:
  Array of comments with id, text, timestamp, author, and createdAt.`,
    {
      videoId: z.string().describe('The Loom video ID'),
    },
    async ({ videoId }) => {
      try {
        const comments = await client.listComments(videoId);
        return {
          content: [{ type: 'text', text: JSON.stringify(comments, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_create_comment',
    `Add a comment to a video.

Args:
  - videoId: The Loom video ID
  - text: Comment text
  - timestamp: Optional timestamp in seconds where the comment applies

Returns:
  The created comment object.`,
    {
      videoId: z.string().describe('The Loom video ID'),
      text: z.string().describe('Comment text'),
      timestamp: z.number().optional().describe('Timestamp in seconds'),
    },
    async ({ videoId, text, timestamp }) => {
      try {
        const comment = await client.createComment(videoId, { text, timestamp });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Comment created', comment }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  // ===========================================================================
  // Folder Tools
  // ===========================================================================

  server.tool(
    'loom_list_folders',
    `List folders from the user's Loom account.

Args:
  - perPage: Number of folders per page
  - nextCursor: Pagination cursor

Returns:
  Paginated list of folders with id, name, videoCount.`,
    {
      perPage: z.number().int().min(1).max(100).optional().describe('Folders per page'),
      nextCursor: z.string().optional().describe('Pagination cursor'),
    },
    async ({ perPage, nextCursor }) => {
      try {
        const result = await client.listFolders({ perPage, nextCursor });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_create_folder',
    `Create a new folder.

Args:
  - name: Folder name
  - parentId: Optional parent folder ID for nested folders

Returns:
  The created folder object.`,
    {
      name: z.string().describe('Folder name'),
      parentId: z.string().optional().describe('Parent folder ID'),
    },
    async ({ name, parentId }) => {
      try {
        const folder = await client.createFolder(name, parentId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Folder created', folder }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_get_folder',
    `Get details about a specific folder.

Args:
  - folderId: The folder ID

Returns:
  Folder object with id, name, videoCount.`,
    {
      folderId: z.string().describe('The folder ID'),
    },
    async ({ folderId }) => {
      try {
        const folder = await client.getFolder(folderId);
        return {
          content: [{ type: 'text', text: JSON.stringify(folder, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_update_folder',
    `Update a folder's name.

Args:
  - folderId: The folder ID
  - name: New folder name

Returns:
  Updated folder object.`,
    {
      folderId: z.string().describe('The folder ID'),
      name: z.string().describe('New folder name'),
    },
    async ({ folderId, name }) => {
      try {
        const folder = await client.updateFolder(folderId, { name });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: 'Folder updated', folder }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_delete_folder',
    `Delete a folder.

Args:
  - folderId: The folder ID to delete

Returns:
  Confirmation of deletion.`,
    {
      folderId: z.string().describe('The folder ID to delete'),
    },
    async ({ folderId }) => {
      try {
        await client.deleteFolder(folderId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: `Folder ${folderId} deleted` },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  // ===========================================================================
  // Workspace Tools
  // ===========================================================================

  server.tool(
    'loom_list_workspaces',
    `List all workspaces the user has access to.

Returns:
  Array of workspaces with id, name, memberCount.`,
    {},
    async () => {
      try {
        const workspaces = await client.listWorkspaces();
        return {
          content: [{ type: 'text', text: JSON.stringify(workspaces, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_get_workspace',
    `Get details about a specific workspace.

Args:
  - workspaceId: The workspace ID

Returns:
  Workspace object with id, name, memberCount.`,
    {
      workspaceId: z.string().describe('The workspace ID'),
    },
    async ({ workspaceId }) => {
      try {
        const workspace = await client.getWorkspace(workspaceId);
        return {
          content: [{ type: 'text', text: JSON.stringify(workspace, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  // ===========================================================================
  // Space (Shared Library) Tools
  // ===========================================================================

  server.tool(
    'loom_list_spaces',
    `List shared library spaces.

Args:
  - perPage: Number of spaces per page
  - nextCursor: Pagination cursor

Returns:
  Paginated list of spaces.`,
    {
      perPage: z.number().int().min(1).max(100).optional().describe('Spaces per page'),
      nextCursor: z.string().optional().describe('Pagination cursor'),
    },
    async ({ perPage, nextCursor }) => {
      try {
        const result = await client.listSpaces({ perPage, nextCursor });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_get_space',
    `Get details about a shared library space.

Args:
  - spaceId: The space ID

Returns:
  Space object with id, name, description, memberCount, videoCount.`,
    {
      spaceId: z.string().describe('The space ID'),
    },
    async ({ spaceId }) => {
      try {
        const space = await client.getSpace(spaceId);
        return {
          content: [{ type: 'text', text: JSON.stringify(space, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_list_space_videos',
    `List videos in a shared library space.

Args:
  - spaceId: The space ID
  - perPage: Videos per page
  - nextCursor: Pagination cursor

Returns:
  Paginated list of videos in the space.`,
    {
      spaceId: z.string().describe('The space ID'),
      perPage: z.number().int().min(1).max(100).optional().describe('Videos per page'),
      nextCursor: z.string().optional().describe('Pagination cursor'),
    },
    async ({ spaceId, perPage, nextCursor }) => {
      try {
        const result = await client.listSpaceVideos(spaceId, { perPage, nextCursor });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_add_video_to_space',
    `Add a video to a shared library space.

Args:
  - spaceId: The space ID
  - videoId: The video ID to add

Returns:
  Confirmation of addition.`,
    {
      spaceId: z.string().describe('The space ID'),
      videoId: z.string().describe('The video ID to add'),
    },
    async ({ spaceId, videoId }) => {
      try {
        await client.addVideoToSpace(spaceId, videoId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: `Video ${videoId} added to space ${spaceId}` },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'loom_remove_video_from_space',
    `Remove a video from a shared library space.

Args:
  - spaceId: The space ID
  - videoId: The video ID to remove

Returns:
  Confirmation of removal.`,
    {
      spaceId: z.string().describe('The space ID'),
      videoId: z.string().describe('The video ID to remove'),
    },
    async ({ spaceId, videoId }) => {
      try {
        await client.removeVideoFromSpace(spaceId, videoId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: `Video ${videoId} removed from space ${spaceId}` },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  // ===========================================================================
  // oEmbed Tools
  // ===========================================================================

  server.tool(
    'loom_get_oembed',
    `Get oEmbed metadata for a Loom video URL.

Args:
  - url: The Loom video share URL
  - maxWidth: Maximum width for embed
  - maxHeight: Maximum height for embed

Returns:
  oEmbed object with HTML embed code, dimensions, title, thumbnail.`,
    {
      url: z.string().url().describe('Loom video share URL'),
      maxWidth: z.number().int().optional().describe('Maximum embed width'),
      maxHeight: z.number().int().optional().describe('Maximum embed height'),
    },
    async ({ url, maxWidth, maxHeight }) => {
      try {
        const oembed = await client.getOEmbed(url, { maxWidth, maxHeight });
        return {
          content: [{ type: 'text', text: JSON.stringify(oembed, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  // ===========================================================================
  // Embed Tools
  // ===========================================================================

  server.tool(
    'loom_get_embed_html',
    `Generate embed HTML code for a video.

Args:
  - videoId: The Loom video ID
  - width: Embed width in pixels (default: 640)
  - height: Embed height in pixels (default: 360)
  - autoplay: Whether to autoplay the video

Returns:
  HTML iframe embed code.`,
    {
      videoId: z.string().describe('The Loom video ID'),
      width: z.number().int().optional().describe('Embed width in pixels'),
      height: z.number().int().optional().describe('Embed height in pixels'),
      autoplay: z.boolean().optional().describe('Autoplay video'),
    },
    async ({ videoId, width, height, autoplay }) => {
      try {
        const result = await client.getEmbedHtml(videoId, { width, height, autoplay });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );

  // ===========================================================================
  // SDK Record Link Tools
  // ===========================================================================

  server.tool(
    'loom_create_record_link',
    `Create a shareable link that allows someone to record a Loom video.

Args:
  - title: Optional title for the recorded video
  - folderId: Optional folder ID to save the video to
  - expiresInMinutes: Optional expiration time in minutes

Returns:
  Record link object with URL and metadata.`,
    {
      title: z.string().optional().describe('Title for recorded video'),
      folderId: z.string().optional().describe('Folder ID to save video'),
      expiresInMinutes: z.number().int().optional().describe('Link expiration in minutes'),
    },
    async ({ title, folderId, expiresInMinutes }) => {
      try {
        const link = await client.createRecordLink({ title, folderId, expiresInMinutes });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: 'Record link created', link },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${formatError(error)}` }],
          isError: true,
        };
      }
    }
  );
}
