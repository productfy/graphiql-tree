import { GraphQLSchema } from 'graphql';
import React from 'react';

import DefaultValueCustomizer from './DefaultValueCustomizer';
import NodeCustomizer from './NodeCustomizer';

const DefaultValueCustomizerContext = React.createContext<DefaultValueCustomizer>(() => undefined);
DefaultValueCustomizerContext.displayName = 'DefaultValueCustomizerContext';

const NodeCustomizerContext = React.createContext<NodeCustomizer>(() => {});
NodeCustomizerContext.displayName = 'NodeCustomizerContext';

const SchemaContext = React.createContext<GraphQLSchema | undefined>(undefined);
SchemaContext.displayName = 'SchemaContext';

export { DefaultValueCustomizerContext, NodeCustomizerContext, SchemaContext };
