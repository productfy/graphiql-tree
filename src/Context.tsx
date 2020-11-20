import { GraphQLSchema } from 'graphql';
import React from 'react';

const CustomNodeContext = React.createContext<(params: any) => JSX.Element | void>(() => {});
CustomNodeContext.displayName = 'CustomNodeContext';

const SchemaContext = React.createContext<GraphQLSchema | undefined>(undefined);
SchemaContext.displayName = 'SchemaContext';

export { CustomNodeContext, SchemaContext };
