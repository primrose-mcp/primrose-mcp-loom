# Loom MCP Server

[![Primrose MCP](https://img.shields.io/badge/Primrose-MCP-blue)](https://primrose.dev/mcp/loom)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server for integrating with Loom, the video messaging platform. This server enables AI assistants to manage videos, transcripts, folders, and more through Loom's API.

## Features

- **User Management** - Access current user information
- **Video Management** - List, search, update, and delete videos
- **Transcript Access** - Get video transcripts with timestamps
- **Analytics Tools** - Access video analytics and insights
- **Comment Management** - List and create video comments
- **Folder Management** - Organize videos in folders
- **Workspace Management** - Access workspace information
- **Space Management** - Manage shared library spaces
- **oEmbed Support** - Get embed metadata for videos
- **Embed Generation** - Generate HTML embed codes
- **Record Links** - Create shareable recording links

## Quick Start

The easiest way to get started is using the [Primrose SDK](https://github.com/primrose-ai/primrose-mcp):

```bash
npm install primrose-mcp
```

```typescript
import { PrimroseClient } from 'primrose-mcp';

const client = new PrimroseClient({
  service: 'loom',
  headers: {
    'X-Loom-Access-Token': 'your-access-token'
  }
});
```

## Manual Installation

```bash
# Clone and install
git clone https://github.com/primrose-ai/primrose-mcp-loom.git
cd primrose-mcp-loom
npm install

# Build
npm run build

# Run locally
npm run dev
```

## Configuration

### Required Headers

| Header | Description |
|--------|-------------|
| `X-Loom-Access-Token` | OAuth access token for Loom API |

### Optional Headers

| Header | Description |
|--------|-------------|
| `X-Loom-Base-URL` | Override the default Loom API base URL |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CHARACTER_LIMIT` | 50000 | Maximum response character limit |
| `DEFAULT_PAGE_SIZE` | 20 | Default pagination size |
| `MAX_PAGE_SIZE` | 100 | Maximum pagination size |

## Available Tools

### User Tools
- `loom_get_current_user` - Get the current authenticated user's information

### Video Tools
- `loom_list_videos` - List videos with pagination
- `loom_get_video` - Get detailed video information
- `loom_update_video` - Update video title, description, or privacy
- `loom_delete_video` - Delete a video
- `loom_search_videos` - Search for videos by query
- `loom_move_video_to_folder` - Move a video to a folder
- `loom_duplicate_video` - Duplicate a video

### Transcript Tools
- `loom_get_transcript` - Get video transcript with timestamps

### Analytics Tools
- `loom_get_video_analytics` - Get analytics for a video

### Comment Tools
- `loom_list_comments` - List comments on a video
- `loom_create_comment` - Add a comment to a video

### Folder Tools
- `loom_list_folders` - List folders
- `loom_create_folder` - Create a new folder
- `loom_get_folder` - Get folder details
- `loom_update_folder` - Update folder name
- `loom_delete_folder` - Delete a folder

### Workspace Tools
- `loom_list_workspaces` - List workspaces
- `loom_get_workspace` - Get workspace details

### Space Tools
- `loom_list_spaces` - List shared library spaces
- `loom_get_space` - Get space details
- `loom_list_space_videos` - List videos in a space
- `loom_add_video_to_space` - Add a video to a space
- `loom_remove_video_from_space` - Remove a video from a space

### Embed Tools
- `loom_get_oembed` - Get oEmbed metadata for a video URL
- `loom_get_embed_html` - Generate HTML embed code

### Record Link Tools
- `loom_create_record_link` - Create a shareable recording link

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Run type checking
npm run typecheck
```

## Related Resources

- [Primrose SDK Documentation](https://primrose.dev/docs)
- [Loom Developer API Documentation](https://dev.loom.com/docs)
- [Loom Developer Portal](https://dev.loom.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## License

MIT
