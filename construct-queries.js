import fs from 'fs';
import path from 'path';
import { sparqlEscapeUri } from 'mu';

String.prototype.replaceAll = function (from, to) {
  return this.split(from).join(to);
}

function constructListSubcasesQuery (batchSize, graph) {
  const p = path.resolve(__dirname, './queries/1-list-subcases.sparql');
  let query = fs.readFileSync(p, { encoding: 'utf8' });
  query = query.replace('# LIMIT_PLACEHOLDER', batchSize);
  query = query.replaceAll('# GRAPH_PLACEHOLDER', sparqlEscapeUri(graph));
  return query;
}

function constructSubcaseInfoQuery (subcaseUri, graph) {
  const p = path.resolve(__dirname, './queries/2-info-from-subcase.sparql');
  let query = fs.readFileSync(p, { encoding: 'utf8' });
  query = query.replace('# SUBCASE_PLACEHOLDER', sparqlEscapeUri(subcaseUri));
  query = query.replaceAll('# GRAPH_PLACEHOLDER', sparqlEscapeUri(graph));
  return query;
}

function constructRemoveFlagQuery (graph) {
  const p = path.resolve(__dirname, './queries/4-remove-flag.sparql');
  let query = fs.readFileSync(p, { encoding: 'utf8' });
  query = query.replaceAll('# GRAPH_PLACEHOLDER', sparqlEscapeUri(graph));
  return query;
}

function constructInsertTriplesQuery (graph, triples) {
  let query = `
  PREFIX pav: <http://purl.org/pav/>
  PREFIX dct: <http://purl.org/dc/terms/>

  INSERT DATA {
    GRAPH # GRAPH_PLACEHOLDER {
  `;
  for (const t of triples) {
    query += `    ${t.s} ${t.p} ${t.o} .\n`;
  }
  query += `
    }
  }
  `;
  query = query.replaceAll('# GRAPH_PLACEHOLDER', sparqlEscapeUri(graph));
  return query;
}

export {
  constructListSubcasesQuery,
  constructSubcaseInfoQuery,
  constructRemoveFlagQuery,
  constructInsertTriplesQuery
};
