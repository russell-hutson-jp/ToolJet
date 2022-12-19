import { tooljetDatabaseService } from '@/_services';
import { isEmpty } from 'lodash';
import PostgrestQueryBuilder from '@/_helpers/postgrestQueryBuilder';
import { resolveReferences } from '@/_helpers/utils';

export const tooljetDbOperations = {
  perform,
};

async function perform(queryOptions, organizationId, currentState) {
  switch (queryOptions.operation) {
    case 'list_rows':
      return listRows(queryOptions, organizationId, currentState);
    case 'create_row':
      return createRow(queryOptions, organizationId, currentState);
  }
}

function buildPostgrestQuery(filters) {
  if (isEmpty(filters)) return null;

  const postgrestQueryBuilder = new PostgrestQueryBuilder();

  Object.keys(filters).map((key) => {
    if (!isEmpty(filters[key])) {
      const { column, operator, value } = filters[key];
      if (!isEmpty(column) && !isEmpty(operator) && !isEmpty(value)) {
        postgrestQueryBuilder[operator](column, value.toString());
      }
    }
  });

  return postgrestQueryBuilder.url.toString();
}

async function listRows(queryOptions, organizationId, currentState) {
  const resolvedOptions = resolveReferences(queryOptions, currentState);
  const { table_name: tableName, list_rows: listRows } = resolvedOptions;
  const { limit, where_filters: whereFilters, order_filters: orderFilters } = listRows;

  let query = [];
  const whereQuery = buildPostgrestQuery(whereFilters);
  const orderQuery = buildPostgrestQuery(orderFilters);

  !isEmpty(whereQuery) && query.push(whereQuery);
  !isEmpty(orderQuery) && query.push(orderQuery);
  !isEmpty(limit) && query.push(`limit=${limit}`);

  return await tooljetDatabaseService.findOne(organizationId, tableName, query.join('&'));
}

async function createRow(queryOptions, organizationId, currentState) {
  const resolvedOptions = resolveReferences(queryOptions, currentState);
  const columns = Object.values(resolvedOptions.create_row).reduce((acc, colOpts) => {
    if (isEmpty(colOpts.column)) return acc;
    return { ...acc, ...{ [colOpts.column]: colOpts.value } };
  }, {});
  return await tooljetDatabaseService.createRow(organizationId, resolvedOptions.table_name, columns);
}

// async function updateRow(organization_id, queryOptions) {
//   return await tooljetDatabaseService.createRow(
//     organization_id,
//     table_name,
//     body
//   );
// }

// async function deleteRow(organization_id, queryOptions) {
//   return await tooljetDatabaseService.deleteRow(
//     organization_id,
//     table_name,
//     query
//   );
// }

// async function listTables(organization_id, queryOptions) {
//   return await tooljetDatabaseService.findAll(organization_id);
// }