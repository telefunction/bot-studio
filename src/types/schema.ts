export type TelegramParameter = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type TelegramMethod = {
  name: string;
  category: string;
  description: string;
  parameters: TelegramParameter[];
  officialUrl: string;
};

export type TelegramType = {
  name: string;
  category: string;
  description: string;
  fields: TelegramParameter[];
  officialUrl: string;
};

export type TelegramSchema = {
  source: string;
  fetchedAt: string;
  generatedBy: string;
  methodCount: number;
  typeCount: number;
  methods: TelegramMethod[];
  types: TelegramType[];
};

export type FileValue = {
  mode: 'text' | 'file';
  text: string;
  file: File | null;
};

export type ParamValue = string | boolean | FileValue;

export type ResponseState = {
  status: 'waiting' | 'loading' | 'ok' | 'failed' | string;
  payload: unknown;
  error: string;
};

export type NoticeTone = 'success' | 'error' | 'warning' | 'info';

export type Notice = {
  id: number;
  tone: NoticeTone;
  title: string;
  message: string;
};
