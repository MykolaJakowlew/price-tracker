
import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

const YAML_CONFIG_FILENAME = 'config.yaml';

export interface Config {
  port: number,
  publicUrl: string,
  mongodbUrl: string,
  telegram: {
    token: string
  }
}

export default () => {
  return yaml.load(
    readFileSync(join(__dirname, '../../',YAML_CONFIG_FILENAME), 'utf8'),
  ) as Record<string, any>;
};