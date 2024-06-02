import { Application } from "express";

export type RoutesInput = {
  app: Application,
}

export type TErrorResponse = {
  error: string|null;
  description?: string;
  property?: string;
}

export type TProject = {
  id: string;
  name: string;
  projectNumber: number;
  plan: string;
  planFinishedAt: Date;
  trialFinishedAt: Date;
}

type TFeature = {
  code: string;
  rules: {[key: string]: any};
}

export type TPlan = {
  name: string;
  code: string;
  features: TFeature[];
  default: boolean;
}