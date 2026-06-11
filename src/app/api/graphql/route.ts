import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { typeDefs } from '@/graphql/schema';
import { resolvers, GqlContext } from '@/graphql/resolvers';
import { getSession } from '@/lib/session';

const server = new ApolloServer<GqlContext>({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production', // Disable schema introspection in production
});

const handler = startServerAndCreateNextHandler<NextRequest, GqlContext>(server, {
  context: async (): Promise<GqlContext> => {
    const session = await getSession();
    return { session };
  },
});

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
