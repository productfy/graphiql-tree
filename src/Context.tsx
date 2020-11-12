import { GraphQLSchema } from 'graphql';
import React from 'react';

const SchemaContext = React.createContext<GraphQLSchema | undefined>(undefined);
SchemaContext.displayName = 'SchemaContext';

export { SchemaContext };
