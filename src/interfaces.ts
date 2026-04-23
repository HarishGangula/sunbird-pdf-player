export interface Pdata {
  id: string;
  pid?: string;
  ver?: string;
}

export interface ContextRollup {
  l1?: string;
  l2?: string;
  l3?: string;
  l4?: string;
}

export interface Cdata {
  type: string;
  id: string;
}

export interface ObjectRollup {
  l1?: string;
  l2?: string;
  l3?: string;
  l4?: string;
}

export interface Context {
  mode?: string;
  authToken?: string;
  sid?: string;
  did?: string;
  uid?: string;
  channel: string;
  pdata: Pdata;
  contextRollup?: ContextRollup;
  tags?: string[];
  cdata?: Cdata[];
  timeDiff?: number;
  objectRollup?: ObjectRollup;
  host?: string;
  endpoint?: string;
  dispatcher?: object;
  userData?: { firstName: string; lastName: string };
  resourceBundles?: { [key: string]: string };
}

export interface ToolBarConfig {
  showZoomButtons?: boolean;
  showPagesButton?: boolean;
  showPagingButtons?: boolean;
  showSearchButton?: boolean;
  showRotateButton?: boolean;
}

export interface SideMenuConfig {
  showReplay?: boolean;
  showExit?: boolean;
  showPrint?: boolean;
}

export interface Config {
  toolBar?: ToolBarConfig;
  sideMenu?: SideMenuConfig;
  startFromPage?: number;
  zoom?: number;
  rotation?: number;
  [propName: string]: any;
}

export interface Metadata {
  identifier: string;
  name: string;
  artifactUrl: string;
  streamingUrl?: string;
  compatibilityLevel?: number;
  pkgVersion?: number;
  isAvailableLocally?: boolean;
  basePath?: string;
  baseDir?: string;
}

export interface PlayerConfig {
  context?: Context;
  config?: Config;
  metadata: Metadata;
}
