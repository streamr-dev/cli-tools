#!/usr/bin/env node -r ts-node/register
import { Command } from 'commander';
import {
    envOptions,
    authOptions,
    formStreamrOptionsWithEnv
} from './common'
import pkg from '../package.json'
import { AnonymousStreamPermisson, StreamOperation, StreamrClient, UserStreamPermission } from 'streamr-client';
import EasyTable from 'easy-table'

const PUBLIC_PERMISSION_ID = 'public'

const OPERATIONS: Record<string,StreamOperation> = {
    'get': StreamOperation.STREAM_GET,
    'edit': StreamOperation.STREAM_EDIT,
    'delete': StreamOperation.STREAM_DELETE,
    'publish': StreamOperation.STREAM_PUBLISH,
    'subscribe': StreamOperation.STREAM_SUBSCRIBE,
    'share': StreamOperation.STREAM_SHARE
}

const getOperation = (id: string) => {
    const operation = OPERATIONS[id]
    if (operation === undefined) {
        console.error(`error: invalid operation: ${id}`)
        process.exit(1)
    }
    return operation
}

const getOperationId = (operation: StreamOperation) => {
    for (let id of Object.keys(OPERATIONS)) {
        if (OPERATIONS[id] === operation) {
            return id
        }
    }
}

const getTarget = (user: string): string|undefined => {
    if (user === PUBLIC_PERMISSION_ID) {
        return undefined
    } else {
        return user
    }
}

const program = new Command();
program
    .arguments('<streamId> <user> <operations...>')
    .description('grant permission: use keyword "public" as a user to grant a public permission')
authOptions(program)
envOptions(program)
    .version(pkg.version)
    .action(async (streamId: string, user: string, operationIds: string[], options: any) => {
        const operations = operationIds.map((o: string) => getOperation(o))
        const target = getTarget(user)
        const client = new StreamrClient(formStreamrOptionsWithEnv(options))
        const stream = await client.getStream(streamId)
        const tasks = operations.map((operation: StreamOperation) => stream.grantPermission(operation, target))
        const permissions = await Promise.all(tasks)
        console.info(EasyTable.print(permissions.map((permission: UserStreamPermission|AnonymousStreamPermisson) => ({
            id: permission.id,
            operation: getOperationId(permission.operation),
            user: (permission as AnonymousStreamPermisson).anonymous ? PUBLIC_PERMISSION_ID : (permission as UserStreamPermission).user
        }))))
    })
    .parseAsync(process.argv)