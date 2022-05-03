import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { Client } from '@notionhq/client';
import { NotionBlocksHtmlParser } from '@notion-stuff/blocks-html-parser';
import { GetBlockResponse } from '@notionhq/client/build/src/api-endpoints';
import { ConfigService } from '@nestjs/config';

type Block = Extract<
  GetBlockResponse,
  {
    type: string;
  }
>;

const BLOCK_TYPE = {
  CHILD_PAGE: 'child_page',
} as const;

class Post {
  blockId: string;
  title: string;
  constructor(blockId: string, title: string) {
    this.blockId = blockId;
    this.title = title;
  }
}

const parsePages = (pages: any[]) => {
  return pages
    .filter((result) => result.type === BLOCK_TYPE.CHILD_PAGE)
    .map((result) => new Post(result.id, result[result.type].title));
};

@Controller('/api')
export class AppController {
  private notionApiKey: string;
  private rootPageId: string;

  constructor(
    private readonly appService: AppService,
    private configService: ConfigService,
  ) {
    this.notionApiKey = this.configService.get<string>('NEST_NOTION_API_KEY');
    this.rootPageId = this.configService.get<string>('NEST_ROOT_PAGE_ID');
  }

  @Get('posts')
  getPosts(): any {
    const notion = new Client({
      auth: this.notionApiKey,
    });

    return notion.blocks.children
      .list({ block_id: this.rootPageId })
      .then((response) => parsePages(response.results));
  }

  @Get('posts/:blockId')
  getPost(@Param('blockId') blockId): Promise<string> {
    const notion = new Client({
      auth: this.notionApiKey,
    });

    return notion.blocks.children
      .list({
        block_id: blockId,
      })
      .then((response) => {
        const parser = NotionBlocksHtmlParser.getInstance();

        return parser.parse(response.results as Block[]);
      });
  }
}
