import { SessionRegistry } from './sessionRegistry.js';
import { BlackboardService } from './blackboard.js';
import { Session, ExportedScript, ExportFormat } from '../types/session.js';
import { BlackboardLayer } from '../types/blackboard.js';

export interface ExportResult {
  format: ExportFormat;
  content: string;
  filename: string;
}

export class ExportService {
  constructor(
    private sessionRegistry: SessionRegistry,
    private blackboardService: BlackboardService,
  ) {}

  /**
   * Export session in specified format
   */
  async exportSession(dramaId: string, format: ExportFormat): Promise<ExportResult> {
    const session = this.sessionRegistry.get(dramaId);

    if (!session) {
      throw new Error(`Session not found: ${dramaId}`);
    }

    if (session.status !== 'completed') {
      throw new Error(`Session must be completed to export. Current status: ${session.status}`);
    }

    if (format === ExportFormat.JSON) {
      return this.exportAsJson(session, dramaId);
    } else if (format === ExportFormat.MARKDOWN) {
      return this.exportAsMarkdown(session, dramaId);
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Export as structured JSON
   */
  private async exportAsJson(session: Session, dramaId: string): Promise<ExportResult> {
    const characters = await this.extractCharacters(dramaId);
    const backbone = await this.extractBackbone(dramaId);
    const scenes = this.extractScenes(session);

    const exported: ExportedScript = {
      session: {
        dramaId: session.dramaId,
        name: session.name,
        createdAt: session.createdAt.toISOString(),
        sceneDurationMinutes: session.sceneDurationMinutes,
        agentCount: session.agentCount,
      },
      config: {
        sceneDurationMinutes: session.sceneDurationMinutes,
        agentCount: session.agentCount,
      },
      characters,
      backbone,
      scenes,
    };

    const content = JSON.stringify(exported, null, 2);
    const filename = `${session.name.toLowerCase().replace(/\s+/g, '-')}-script.json`;

    return { format: ExportFormat.JSON, content, filename };
  }

  /**
   * Export as dramatic script Markdown
   */
  private async exportAsMarkdown(session: Session, dramaId: string): Promise<ExportResult> {
    const characters = await this.extractCharacters(dramaId);
    const scenes = this.extractScenes(session);

    let markdown = `# ${session.name}\n\n`;
    markdown += `**Exported:** ${new Date().toISOString()}\n\n`;
    markdown += `**Duration:** ${session.sceneDurationMinutes} minutes\n`;
    markdown += `**Actors:** ${session.agentCount}\n\n`;

    // Character list
    markdown += `## Characters\n\n`;
    for (const char of characters) {
      markdown += `### Actor: ${char.agentId}\n\n${char.characterCard}\n\n`;
    }

    // Scenes
    markdown += `## Scenes\n\n`;
    for (const scene of scenes) {
      markdown += `### Scene: ${scene.location}\n\n`;
      markdown += `*${scene.description}*\n\n`;
      markdown += `**Timestamp:** ${scene.timestamp}\n\n`;

      for (const beat of scene.beats) {
        markdown += `${beat}\n\n`;
      }

      if (scene.conflicts.length > 0) {
        markdown += `**Conflicts:**\n`;
        for (const conflict of scene.conflicts) {
          markdown += `- ${conflict}\n`;
        }
        markdown += `\n`;
      }

      markdown += `---\n\n`;
    }

    const filename = `${session.name.toLowerCase().replace(/\s+/g, '-')}-script.md`;

    return { format: ExportFormat.MARKDOWN, content: markdown, filename };
  }

  /**
   * Extract character cards from blackboard semantic layer
   */
  private async extractCharacters(dramaId: string): Promise<Array<{ agentId: string; characterCard: string }>> {
    const readResponse = this.blackboardService.readLayer(dramaId, 'semantic');
    const characters: Array<{ agentId: string; characterCard: string }> = [];

    for (const entry of readResponse.entries) {
      if (entry.metadata?.characterCardFor) {
        characters.push({
          agentId: entry.metadata.characterCardFor,
          characterCard: entry.content,
        });
      }
    }

    return characters;
  }

  /**
   * Extract backbone from blackboard core layer
   */
  private async extractBackbone(dramaId: string): Promise<Array<{ id: string; timestamp: string; content: string }>> {
    const readResponse = this.blackboardService.readLayer(dramaId, 'core');
    const backbone: Array<{ id: string; timestamp: string; content: string }> = [];

    for (const entry of readResponse.entries) {
      backbone.push({
        id: entry.id,
        timestamp: entry.timestamp,
        content: entry.content,
      });
    }

    return backbone;
  }

  /**
   * Extract scene data from Session.lastResult
   */
  private extractScenes(session: Session): Array<{
    sceneId: string;
    location: string;
    description: string;
    timestamp: string;
    beats: string[];
    conflicts: string[];
  }> {
    if (!session.lastResult) {
      return [];
    }

    // For now, use simplified scene data from lastResult
    // Future enhancement: extract full scene details from procedural layer
    return [{
      sceneId: session.lastResult.sceneId,
      location: 'Scene Location', // Would be extracted from procedural layer
      description: 'Scene Description', // Would be extracted from procedural layer
      timestamp: session.updatedAt.toISOString(),
      beats: session.lastResult.beats,
      conflicts: session.lastResult.conflicts,
    }];
  }
}
