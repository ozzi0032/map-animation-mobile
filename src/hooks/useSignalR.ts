import * as signalR from '@microsoft/signalr';
import { useEffect, useRef } from 'react';
import { BASE_URL } from '../constants/endpoints';
import { useProjectStore } from '../store/projectStore';
import { tokenUtils } from '../utils/tokenUtils';

type JobStatusPayload = {
  projectId: number;
  jobStatus: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  isTerminal?: boolean;
  errorMessage?: string | null;
};

export function useProjectSignalR() {
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    // Strip /api/v1 to get the root origin for the hub URL
    const hubBase = BASE_URL.replace(/\/api\/v1\/?$/, '');

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${hubBase}/hubs/notification`, {
        accessTokenFactory: async () => {
          const token = await tokenUtils.getAccessToken();
          return token ?? '';
        },
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('JobStatusChanged', (data: JobStatusPayload) => {
      const updates: Record<string, unknown> = {};
      if (data.videoUrl !== undefined) updates.videoUrl = data.videoUrl;
      if (data.thumbnailUrl !== undefined) updates.thumbnailUrl = data.thumbnailUrl;
      if (data.isTerminal !== undefined) {
        updates.isCompleted = data.jobStatus === 'Completed';
        updates.isFailed = data.jobStatus === 'Failed';
        updates.isProcessing = !data.isTerminal && data.jobStatus === 'Rendering';
        updates.canOpenPreview = data.jobStatus === 'Completed';
      }
      useProjectStore
        .getState()
        .patchProjectStatus(data.projectId, data.jobStatus, updates as any);
    });

    connection.start().catch(() => {
      // Silent — no server during dev or network unavailable
    });

    connectionRef.current = connection;

    return () => {
      connection.stop().catch(() => {});
    };
  }, []);
}
