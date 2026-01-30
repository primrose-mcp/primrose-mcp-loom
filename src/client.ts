/**
 * Loom API Client
 *
 * Handles all HTTP communication with the Loom Public API.
 * Reference: https://dev.loom.com/docs/api-reference
 *
 * MULTI-TENANT: This client receives credentials per-request via TenantCredentials,
 * allowing a single server to serve multiple tenants with different access tokens.
 */

import type { TenantCredentials } from './types/env.js';
import { AuthenticationError, LoomApiError, RateLimitError } from './utils/errors.js';

// =============================================================================
// Configuration
// =============================================================================

const API_BASE_URL = 'https://api.loom.com/v1';

// =============================================================================
// Loom API Types
// =============================================================================

export interface LoomUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface LoomVideo {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  duration?: number;
  thumbnailUrl?: string;
  embedUrl?: string;
  shareUrl?: string;
  downloadUrl?: string;
  viewCount?: number;
  privacy?: 'public' | 'private' | 'company' | 'password';
  createdAt: string;
  updatedAt?: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  workspace?: {
    id: string;
    name: string;
  };
  folderId?: string;
}

export interface LoomTranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export interface LoomTranscript {
  transcript: LoomTranscriptSegment[];
  fullText: string;
}

export interface LoomFolder {
  id: string;
  name: string;
  videoCount?: number;
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
}

export interface LoomWorkspace {
  id: string;
  name: string;
  memberCount?: number;
  createdAt?: string;
}

export interface LoomAnalytics {
  totalViews: number;
  uniqueViewers: number;
  averagePercentWatched: number;
  totalWatchTime: number;
}

export interface LoomComment {
  id: string;
  text: string;
  timestamp?: number;
  author: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface LoomSpace {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  videoCount?: number;
  createdAt?: string;
}

export interface LoomOEmbed {
  version: string;
  type: string;
  html: string;
  width: number;
  height: number;
  title: string;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  providerName: string;
  providerUrl: string;
  duration?: number;
}

export interface LoomRecordLink {
  id: string;
  url: string;
  title?: string;
  expiresAt?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

// =============================================================================
// Loom Client Interface
// =============================================================================

export interface LoomClient {
  // Connection
  testConnection(): Promise<{ connected: boolean; message: string }>;

  // User
  getCurrentUser(): Promise<LoomUser>;

  // Videos
  listVideos(params?: {
    perPage?: number;
    nextCursor?: string;
  }): Promise<PaginatedResponse<LoomVideo>>;
  getVideo(videoId: string): Promise<LoomVideo>;
  updateVideo(
    videoId: string,
    params: { title?: string; description?: string; privacy?: string }
  ): Promise<{ id: string }>;
  deleteVideo(videoId: string): Promise<void>;

  // Transcripts
  getTranscript(videoId: string): Promise<LoomTranscript>;

  // Analytics
  getVideoAnalytics(videoId: string): Promise<LoomAnalytics>;

  // Comments
  listComments(videoId: string): Promise<LoomComment[]>;
  createComment(
    videoId: string,
    params: { text: string; timestamp?: number }
  ): Promise<LoomComment>;

  // Folders
  listFolders(params?: {
    perPage?: number;
    nextCursor?: string;
  }): Promise<PaginatedResponse<LoomFolder>>;
  createFolder(name: string, parentId?: string): Promise<LoomFolder>;
  getFolder(folderId: string): Promise<LoomFolder>;
  updateFolder(folderId: string, params: { name?: string }): Promise<LoomFolder>;
  deleteFolder(folderId: string): Promise<void>;

  // Workspaces
  listWorkspaces(): Promise<LoomWorkspace[]>;
  getWorkspace(workspaceId: string): Promise<LoomWorkspace>;

  // Spaces (Shared Libraries)
  listSpaces(params?: {
    perPage?: number;
    nextCursor?: string;
  }): Promise<PaginatedResponse<LoomSpace>>;
  getSpace(spaceId: string): Promise<LoomSpace>;
  listSpaceVideos(
    spaceId: string,
    params?: { perPage?: number; nextCursor?: string }
  ): Promise<PaginatedResponse<LoomVideo>>;
  addVideoToSpace(spaceId: string, videoId: string): Promise<void>;
  removeVideoFromSpace(spaceId: string, videoId: string): Promise<void>;

  // oEmbed
  getOEmbed(
    url: string,
    params?: { maxWidth?: number; maxHeight?: number }
  ): Promise<LoomOEmbed>;

  // SDK Record Links
  createRecordLink(params?: {
    title?: string;
    folderId?: string;
    expiresInMinutes?: number;
  }): Promise<LoomRecordLink>;

  // Embed HTML helper
  getEmbedHtml(
    videoId: string,
    params?: { width?: number; height?: number; autoplay?: boolean }
  ): Promise<{ html: string }>;

  // Video Management
  moveVideoToFolder(videoId: string, folderId: string): Promise<void>;
  duplicateVideo(videoId: string): Promise<LoomVideo>;

  // Search
  searchVideos(
    query: string,
    params?: { perPage?: number; nextCursor?: string }
  ): Promise<PaginatedResponse<LoomVideo>>;
}

// =============================================================================
// Loom Client Implementation
// =============================================================================

class LoomClientImpl implements LoomClient {
  private credentials: TenantCredentials;
  private baseUrl: string;

  constructor(credentials: TenantCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.baseUrl || API_BASE_URL;
  }

  // ===========================================================================
  // HTTP Request Helper
  // ===========================================================================

  private getAuthHeaders(): Record<string, string> {
    if (!this.credentials.accessToken) {
      throw new AuthenticationError(
        'No credentials provided. Include X-Loom-Access-Token header.'
      );
    }

    return {
      Authorization: `Bearer ${this.credentials.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new RateLimitError(
        'Rate limit exceeded',
        retryAfter ? Number.parseInt(retryAfter, 10) : 60
      );
    }

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError('Authentication failed. Check your Loom access token.');
    }

    // Handle not found
    if (response.status === 404) {
      throw new LoomApiError('Resource not found', 404, 'NOT_FOUND');
    }

    // Handle other errors
    if (!response.ok) {
      const errorBody = await response.text();
      let message = `API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorBody);
        message = errorJson.message || errorJson.error || message;
      } catch {
        // Use default message
      }
      throw new LoomApiError(message, response.status);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  // ===========================================================================
  // Connection
  // ===========================================================================

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const user = await this.getCurrentUser();
      return { connected: true, message: `Connected as ${user.name}` };
    } catch (error) {
      return {
        connected: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  // ===========================================================================
  // User
  // ===========================================================================

  async getCurrentUser(): Promise<LoomUser> {
    const data = await this.request<{
      id: string;
      email: string;
      name: string;
      avatar_url?: string;
    }>('/me');

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      avatarUrl: data.avatar_url,
    };
  }

  // ===========================================================================
  // Videos
  // ===========================================================================

  async listVideos(params?: {
    perPage?: number;
    nextCursor?: string;
  }): Promise<PaginatedResponse<LoomVideo>> {
    const queryParams = new URLSearchParams();
    if (params?.perPage) queryParams.set('per_page', String(params.perPage));
    if (params?.nextCursor) queryParams.set('next_cursor', params.nextCursor);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/videos?${queryString}` : '/videos';

    const data = await this.request<{
      videos: Array<{
        id: string;
        title: string;
        description?: string;
        status: string;
        duration?: number;
        thumbnail_url?: string;
        embed_url?: string;
        share_url?: string;
        download_url?: string;
        view_count?: number;
        privacy?: string;
        created_at: string;
        updated_at?: string;
        owner?: { id: string; name: string; email: string };
        workspace?: { id: string; name: string };
        folder_id?: string;
      }>;
      next_cursor?: string;
    }>(endpoint);

    return {
      items: data.videos.map((v) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        status: v.status as LoomVideo['status'],
        duration: v.duration,
        thumbnailUrl: v.thumbnail_url,
        embedUrl: v.embed_url,
        shareUrl: v.share_url,
        downloadUrl: v.download_url,
        viewCount: v.view_count,
        privacy: v.privacy as LoomVideo['privacy'],
        createdAt: v.created_at,
        updatedAt: v.updated_at,
        owner: v.owner,
        workspace: v.workspace,
        folderId: v.folder_id,
      })),
      nextCursor: data.next_cursor,
      hasMore: !!data.next_cursor,
    };
  }

  async getVideo(videoId: string): Promise<LoomVideo> {
    const data = await this.request<{
      id: string;
      title: string;
      description?: string;
      status: string;
      duration?: number;
      thumbnail_url?: string;
      embed_url?: string;
      share_url?: string;
      download_url?: string;
      view_count?: number;
      privacy?: string;
      created_at: string;
      updated_at?: string;
      owner?: { id: string; name: string; email: string };
      workspace?: { id: string; name: string };
      folder_id?: string;
    }>(`/videos/${videoId}`);

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status as LoomVideo['status'],
      duration: data.duration,
      thumbnailUrl: data.thumbnail_url,
      embedUrl: data.embed_url,
      shareUrl: data.share_url,
      downloadUrl: data.download_url,
      viewCount: data.view_count,
      privacy: data.privacy as LoomVideo['privacy'],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      owner: data.owner,
      workspace: data.workspace,
      folderId: data.folder_id,
    };
  }

  async updateVideo(
    videoId: string,
    params: { title?: string; description?: string; privacy?: string }
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>(`/videos/${videoId}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  }

  async deleteVideo(videoId: string): Promise<void> {
    await this.request(`/videos/${videoId}`, { method: 'DELETE' });
  }

  // ===========================================================================
  // Transcripts
  // ===========================================================================

  async getTranscript(videoId: string): Promise<LoomTranscript> {
    const data = await this.request<{
      transcript: Array<{ start_time: number; end_time: number; text: string }>;
    }>(`/videos/${videoId}/transcript`);

    const transcript = data.transcript.map((t) => ({
      startTime: t.start_time,
      endTime: t.end_time,
      text: t.text,
    }));

    return {
      transcript,
      fullText: transcript.map((t) => t.text).join(' '),
    };
  }

  // ===========================================================================
  // Analytics
  // ===========================================================================

  async getVideoAnalytics(videoId: string): Promise<LoomAnalytics> {
    const data = await this.request<{
      total_views: number;
      unique_viewers: number;
      average_percent_watched: number;
      total_watch_time: number;
    }>(`/videos/${videoId}/analytics`);

    return {
      totalViews: data.total_views,
      uniqueViewers: data.unique_viewers,
      averagePercentWatched: data.average_percent_watched,
      totalWatchTime: data.total_watch_time,
    };
  }

  // ===========================================================================
  // Comments
  // ===========================================================================

  async listComments(videoId: string): Promise<LoomComment[]> {
    const data = await this.request<{
      comments: Array<{
        id: string;
        text: string;
        timestamp?: number;
        author: { id: string; name: string };
        created_at: string;
      }>;
    }>(`/videos/${videoId}/comments`);

    return data.comments.map((c) => ({
      id: c.id,
      text: c.text,
      timestamp: c.timestamp,
      author: c.author,
      createdAt: c.created_at,
    }));
  }

  async createComment(
    videoId: string,
    params: { text: string; timestamp?: number }
  ): Promise<LoomComment> {
    const data = await this.request<{
      id: string;
      text: string;
      timestamp?: number;
      author: { id: string; name: string };
      created_at: string;
    }>(`/videos/${videoId}/comments`, {
      method: 'POST',
      body: JSON.stringify(params),
    });

    return {
      id: data.id,
      text: data.text,
      timestamp: data.timestamp,
      author: data.author,
      createdAt: data.created_at,
    };
  }

  // ===========================================================================
  // Folders
  // ===========================================================================

  async listFolders(params?: {
    perPage?: number;
    nextCursor?: string;
  }): Promise<PaginatedResponse<LoomFolder>> {
    const queryParams = new URLSearchParams();
    if (params?.perPage) queryParams.set('per_page', String(params.perPage));
    if (params?.nextCursor) queryParams.set('next_cursor', params.nextCursor);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/folders?${queryString}` : '/folders';

    const data = await this.request<{
      folders: Array<{
        id: string;
        name: string;
        video_count?: number;
        created_at: string;
        updated_at?: string;
        parent_id?: string;
      }>;
      next_cursor?: string;
    }>(endpoint);

    return {
      items: data.folders.map((f) => ({
        id: f.id,
        name: f.name,
        videoCount: f.video_count,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
        parentId: f.parent_id,
      })),
      nextCursor: data.next_cursor,
      hasMore: !!data.next_cursor,
    };
  }

  async createFolder(name: string, parentId?: string): Promise<LoomFolder> {
    const body: { name: string; parent_id?: string } = { name };
    if (parentId) body.parent_id = parentId;

    const data = await this.request<{
      id: string;
      name: string;
      video_count?: number;
      created_at: string;
      updated_at?: string;
      parent_id?: string;
    }>('/folders', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      id: data.id,
      name: data.name,
      videoCount: data.video_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      parentId: data.parent_id,
    };
  }

  async getFolder(folderId: string): Promise<LoomFolder> {
    const data = await this.request<{
      id: string;
      name: string;
      video_count?: number;
      created_at: string;
      updated_at?: string;
      parent_id?: string;
    }>(`/folders/${folderId}`);

    return {
      id: data.id,
      name: data.name,
      videoCount: data.video_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      parentId: data.parent_id,
    };
  }

  async updateFolder(folderId: string, params: { name?: string }): Promise<LoomFolder> {
    const data = await this.request<{
      id: string;
      name: string;
      video_count?: number;
      created_at: string;
      updated_at?: string;
      parent_id?: string;
    }>(`/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });

    return {
      id: data.id,
      name: data.name,
      videoCount: data.video_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      parentId: data.parent_id,
    };
  }

  async deleteFolder(folderId: string): Promise<void> {
    await this.request(`/folders/${folderId}`, { method: 'DELETE' });
  }

  // ===========================================================================
  // Workspaces
  // ===========================================================================

  async listWorkspaces(): Promise<LoomWorkspace[]> {
    const data = await this.request<{
      workspaces: Array<{
        id: string;
        name: string;
        member_count?: number;
        created_at?: string;
      }>;
    }>('/workspaces');

    return data.workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      memberCount: w.member_count,
      createdAt: w.created_at,
    }));
  }

  async getWorkspace(workspaceId: string): Promise<LoomWorkspace> {
    const data = await this.request<{
      id: string;
      name: string;
      member_count?: number;
      created_at?: string;
    }>(`/workspaces/${workspaceId}`);

    return {
      id: data.id,
      name: data.name,
      memberCount: data.member_count,
      createdAt: data.created_at,
    };
  }

  // ===========================================================================
  // Spaces (Shared Libraries)
  // ===========================================================================

  async listSpaces(params?: {
    perPage?: number;
    nextCursor?: string;
  }): Promise<PaginatedResponse<LoomSpace>> {
    const queryParams = new URLSearchParams();
    if (params?.perPage) queryParams.set('per_page', String(params.perPage));
    if (params?.nextCursor) queryParams.set('next_cursor', params.nextCursor);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/spaces?${queryString}` : '/spaces';

    const data = await this.request<{
      spaces: Array<{
        id: string;
        name: string;
        description?: string;
        member_count?: number;
        video_count?: number;
        created_at?: string;
      }>;
      next_cursor?: string;
    }>(endpoint);

    return {
      items: data.spaces.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        memberCount: s.member_count,
        videoCount: s.video_count,
        createdAt: s.created_at,
      })),
      nextCursor: data.next_cursor,
      hasMore: !!data.next_cursor,
    };
  }

  async getSpace(spaceId: string): Promise<LoomSpace> {
    const data = await this.request<{
      id: string;
      name: string;
      description?: string;
      member_count?: number;
      video_count?: number;
      created_at?: string;
    }>(`/spaces/${spaceId}`);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      memberCount: data.member_count,
      videoCount: data.video_count,
      createdAt: data.created_at,
    };
  }

  async listSpaceVideos(
    spaceId: string,
    params?: { perPage?: number; nextCursor?: string }
  ): Promise<PaginatedResponse<LoomVideo>> {
    const queryParams = new URLSearchParams();
    if (params?.perPage) queryParams.set('per_page', String(params.perPage));
    if (params?.nextCursor) queryParams.set('next_cursor', params.nextCursor);

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/spaces/${spaceId}/videos?${queryString}`
      : `/spaces/${spaceId}/videos`;

    const data = await this.request<{
      videos: Array<{
        id: string;
        title: string;
        description?: string;
        status: string;
        duration?: number;
        thumbnail_url?: string;
        share_url?: string;
        view_count?: number;
        privacy?: string;
        created_at: string;
      }>;
      next_cursor?: string;
    }>(endpoint);

    return {
      items: data.videos.map((v) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        status: v.status as LoomVideo['status'],
        duration: v.duration,
        thumbnailUrl: v.thumbnail_url,
        shareUrl: v.share_url,
        viewCount: v.view_count,
        privacy: v.privacy as LoomVideo['privacy'],
        createdAt: v.created_at,
      })),
      nextCursor: data.next_cursor,
      hasMore: !!data.next_cursor,
    };
  }

  async addVideoToSpace(spaceId: string, videoId: string): Promise<void> {
    await this.request(`/spaces/${spaceId}/videos`, {
      method: 'POST',
      body: JSON.stringify({ video_id: videoId }),
    });
  }

  async removeVideoFromSpace(spaceId: string, videoId: string): Promise<void> {
    await this.request(`/spaces/${spaceId}/videos/${videoId}`, {
      method: 'DELETE',
    });
  }

  // ===========================================================================
  // oEmbed
  // ===========================================================================

  async getOEmbed(
    url: string,
    params?: { maxWidth?: number; maxHeight?: number }
  ): Promise<LoomOEmbed> {
    const queryParams = new URLSearchParams();
    queryParams.set('url', url);
    if (params?.maxWidth) queryParams.set('maxwidth', String(params.maxWidth));
    if (params?.maxHeight) queryParams.set('maxheight', String(params.maxHeight));

    const data = await this.request<{
      version: string;
      type: string;
      html: string;
      width: number;
      height: number;
      title: string;
      thumbnail_url?: string;
      thumbnail_width?: number;
      thumbnail_height?: number;
      provider_name: string;
      provider_url: string;
      duration?: number;
    }>(`/oembed?${queryParams}`);

    return {
      version: data.version,
      type: data.type,
      html: data.html,
      width: data.width,
      height: data.height,
      title: data.title,
      thumbnailUrl: data.thumbnail_url,
      thumbnailWidth: data.thumbnail_width,
      thumbnailHeight: data.thumbnail_height,
      providerName: data.provider_name,
      providerUrl: data.provider_url,
      duration: data.duration,
    };
  }

  // ===========================================================================
  // SDK Record Links
  // ===========================================================================

  async createRecordLink(params?: {
    title?: string;
    folderId?: string;
    expiresInMinutes?: number;
  }): Promise<LoomRecordLink> {
    const body: Record<string, unknown> = {};
    if (params?.title) body.title = params.title;
    if (params?.folderId) body.folder_id = params.folderId;
    if (params?.expiresInMinutes) body.expires_in_minutes = params.expiresInMinutes;

    const data = await this.request<{
      id: string;
      url: string;
      title?: string;
      expires_at?: string;
    }>('/record-links', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      id: data.id,
      url: data.url,
      title: data.title,
      expiresAt: data.expires_at,
    };
  }

  // ===========================================================================
  // Embed HTML Helper
  // ===========================================================================

  async getEmbedHtml(
    videoId: string,
    params?: { width?: number; height?: number; autoplay?: boolean }
  ): Promise<{ html: string }> {
    const video = await this.getVideo(videoId);
    const width = params?.width || 640;
    const height = params?.height || 360;
    const autoplay = params?.autoplay ? '?autoplay=1' : '';

    const embedUrl = video.embedUrl || `https://www.loom.com/embed/${videoId}`;

    return {
      html: `<iframe src="${embedUrl}${autoplay}" width="${width}" height="${height}" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>`,
    };
  }

  // ===========================================================================
  // Video Management
  // ===========================================================================

  async moveVideoToFolder(videoId: string, folderId: string): Promise<void> {
    await this.request(`/videos/${videoId}`, {
      method: 'PATCH',
      body: JSON.stringify({ folder_id: folderId }),
    });
  }

  async duplicateVideo(videoId: string): Promise<LoomVideo> {
    const data = await this.request<{
      id: string;
      title: string;
      description?: string;
      status: string;
      created_at: string;
    }>(`/videos/${videoId}/duplicate`, {
      method: 'POST',
    });

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status as LoomVideo['status'],
      createdAt: data.created_at,
    };
  }

  // ===========================================================================
  // Search
  // ===========================================================================

  async searchVideos(
    query: string,
    params?: { perPage?: number; nextCursor?: string }
  ): Promise<PaginatedResponse<LoomVideo>> {
    const queryParams = new URLSearchParams();
    queryParams.set('q', query);
    if (params?.perPage) queryParams.set('per_page', String(params.perPage));
    if (params?.nextCursor) queryParams.set('next_cursor', params.nextCursor);

    const data = await this.request<{
      videos: Array<{
        id: string;
        title: string;
        description?: string;
        status: string;
        duration?: number;
        thumbnail_url?: string;
        share_url?: string;
        view_count?: number;
        created_at: string;
      }>;
      next_cursor?: string;
    }>(`/videos/search?${queryParams}`);

    return {
      items: data.videos.map((v) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        status: v.status as LoomVideo['status'],
        duration: v.duration,
        thumbnailUrl: v.thumbnail_url,
        shareUrl: v.share_url,
        viewCount: v.view_count,
        createdAt: v.created_at,
      })),
      nextCursor: data.next_cursor,
      hasMore: !!data.next_cursor,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a Loom client instance with tenant-specific credentials.
 *
 * MULTI-TENANT: Each request provides its own credentials via headers,
 * allowing a single server deployment to serve multiple tenants.
 *
 * @param credentials - Tenant credentials parsed from request headers
 */
export function createLoomClient(credentials: TenantCredentials): LoomClient {
  return new LoomClientImpl(credentials);
}
