import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Chunk { source: string; text: string; }

// Files in ./docs to search (served from /docs/ by the Angular build).
const DOC_FILES = ['knowledge.md'];

const STOP = new Set('a an the is are was were do does did i you we my your our of to in on for and or can how what when where who which with at it be if this that about'.split(' '));
const tokenize = (s: string) => (s.toLowerCase().match(/[a-z0-9$]+/g) ?? []).filter((w) => !STOP.has(w));

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private chunks?: Promise<Chunk[]>;

  // Split each document into one chunk per heading section.
  private loadChunks(): Promise<Chunk[]> {
    this.chunks ??= Promise.all(
      DOC_FILES.map(async (file) => {
        const text = await firstValueFrom(this.http.get(`docs/${file}`, { responseType: 'text' }));
        return text.split(/\n(?=#{1,3} )/).filter((p) => p.trim()).map((p) => ({ source: file, text: p.trim() }));
      })
    ).then((all) => all.flat());
    return this.chunks;
  }

  private retrieve(chunks: Chunk[], question: string, k = 3): Chunk[] {
    const q = new Set(tokenize(question));
    return chunks
      .map((c) => {
        const heading = new Set(tokenize(c.text.split('\n')[0]));
        let score = 0;
        for (const w of tokenize(c.text)) if (q.has(w)) score += 1;
        for (const w of heading) if (q.has(w)) score += 5; // heading matches count more
        return { c, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((x) => x.c);
  }

  async send(message: string, _history: ChatMessage[]): Promise<string> {
    const hits = this.retrieve(await this.loadChunks(), message);
    if (!hits.length) {
      return "I couldn't find that in our documents. Please contact us at hello@acmecoffee.example.";
    }
    return hits[0].text.replace(/^#+\s*/, '');
  }
}
