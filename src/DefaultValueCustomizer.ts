import { ValueNode } from 'graphql';
import ParentDefinition from './ParentDefinition';

// TODO: Fix this
type DefaultValueCustomizer = (
  arg: any,
  parentDefinition: ParentDefinition,
) => ValueNode | undefined;
export default DefaultValueCustomizer;
