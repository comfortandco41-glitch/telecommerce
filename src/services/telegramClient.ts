export class TelegramClient {
  private getUrl(botToken: string, method: string): string {
    return `https://api.telegram.org/bot${botToken}/${method}`;
  }

  async sendMessage(
    botToken: string,
    chatId: string | number | bigint,
    text: string,
    replyMarkup?: unknown
  ): Promise<unknown> {
    const url = this.getUrl(botToken, "sendMessage");
    const payload = {
      chat_id: chatId.toString(),
      text,
      parse_mode: "MarkdownV2",
      reply_markup: replyMarkup,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Telegram API Error (sendMessage): ${res.status} - ${errText}`);
    }

    return res.json();
  }

  async editMessageText(
    botToken: string,
    chatId: string | number | bigint,
    messageId: number,
    text: string,
    replyMarkup?: unknown
  ): Promise<unknown> {
    const url = this.getUrl(botToken, "editMessageText");
    const payload = {
      chat_id: chatId.toString(),
      message_id: messageId,
      text,
      parse_mode: "MarkdownV2",
      reply_markup: replyMarkup,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Telegram API Error (editMessageText): ${res.status} - ${errText}`);
    }

    return res.json();
  }

  async answerCallbackQuery(botToken: string, callbackQueryId: string): Promise<unknown> {
    const url = this.getUrl(botToken, "answerCallbackQuery");
    const payload = {
      callback_query_id: callbackQueryId,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Telegram API Error (answerCallbackQuery): ${res.status} - ${errText}`);
    }

    return res.json();
  }

  async getFile(botToken: string, fileId: string): Promise<{ file_path?: string }> {
    const url = this.getUrl(botToken, "getFile") + `?file_id=${fileId}`;
    const res = await fetch(url, { method: "GET" });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Telegram API Error (getFile): ${res.status} - ${errText}`);
    }

    const json = (await res.json()) as any;
    if (!json.ok || !json.result) {
      throw new Error(`Telegram getFile response not OK: ${JSON.stringify(json)}`);
    }
    return json.result;
  }

  async downloadFile(botToken: string, filePath: string): Promise<Buffer> {
    const url = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    const res = await fetch(url, { method: "GET" });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Telegram File Download Error: ${res.status} - ${errText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async sendDocument(
    botToken: string,
    chatId: string | number,
    documentUrl: string,
    _filename?: string
  ): Promise<unknown> {
    const url = this.getUrl(botToken, "sendDocument");
    const payload = {
      chat_id: chatId,
      document: documentUrl,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Telegram API Error (sendDocument): ${res.status} - ${errText}`);
    }

    return res.json();
  }
}
export const telegramClient = new TelegramClient();
