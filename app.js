import {
  query,
  update,
  uuid,
  sparqlEscapeString,
  sparqlEscapeUri
} from 'mu';
import * as queries from './construct-queries';
import { parseSparqlResults } from './util';

const KANSELARIJ_GRAPH = 'http://mu.semte.ch/graphs/organizations/kanselarij';
const SUBMISSION_BASE_URI = 'http://kanselarij.vo.data.gift/id/indieningsactiviteiten/';
const SUBMISSION_TYPE = 'http://mu.semte.ch/vocabularies/ext/Indieningsactiviteit';

async function listSubcasesBatch (batchSize, graph) {
  const listSubcasesQuery = queries.constructListSubcasesQuery(batchSize, graph);
  const queryResult = parseSparqlResults(await query(listSubcasesQuery));
  const subcaseUris = queryResult.map((r) => r.subcase);
  return subcaseUris;
}

async function generateSubmissionForSubcase (subcase) {
  const scQueryString = queries.constructSubcaseInfoQuery(subcase, KANSELARIJ_GRAPH);
  const subcaseInfo = parseSparqlResults(await query(scQueryString))[0];
  const submissionUuid = uuid();
  const submissionUri = SUBMISSION_BASE_URI + submissionUuid;
  const submissionTriples = [
    { s: sparqlEscapeUri(submissionUri), p: 'a', o: sparqlEscapeUri(SUBMISSION_TYPE) },
    { s: sparqlEscapeUri(submissionUri), p: sparqlEscapeUri('http://mu.semte.ch/vocabularies/core/uuid'), o: sparqlEscapeString(submissionUuid) },
    { s: sparqlEscapeUri(submissionUri), p: sparqlEscapeUri('http://mu.semte.ch/vocabularies/ext/indieningVindtPlaatsTijdens'), o: sparqlEscapeUri(subcase) },
    { s: sparqlEscapeUri(submissionUri), p: sparqlEscapeUri('http://mu.semte.ch/vocabularies/ext/tempFlag'), o: sparqlEscapeUri(subcase) }
  ];
  if (subcaseInfo.meeting) { // TODO: Can this be an array?
    submissionTriples.push({
      s: sparqlEscapeUri(submissionUri),
      p: sparqlEscapeUri('http://mu.semte.ch/vocabularies/ext/isAangevraagdVoor'),
      o: sparqlEscapeUri(subcaseInfo.meeting)
    });
  }
  if (subcaseInfo.submitter) { // TODO: Can this be an array?
    submissionTriples.push({
      s: sparqlEscapeUri(submissionUri),
      p: sparqlEscapeUri('http://www.w3.org/ns/prov#qualifiedAssociation'),
      o: sparqlEscapeUri(subcaseInfo.submitter)
    });
  }
  for (const p of subcaseInfo.piece) { // TODO: Can this be an object?
    submissionTriples.push({
      s: sparqlEscapeUri(submissionUri),
      p: sparqlEscapeUri('http://www.w3.org/ns/prov#used'),
      o: sparqlEscapeUri(p)
    });
  }
  const queryString = queries.constructInsertTriplesQuery(KANSELARIJ_GRAPH, submissionTriples);
  await update(queryString);
}

// Begin execution here

const BATCH_SIZE = (process.env.BATCH_SIZE && parseInt(process.env.BATCH_SIZE)) || 200;

(async function () {
  console.log('Generate submission activity for subcases');
  let i = 1;
  while (true) {
    console.log(`Batch ${i} ...`);
    const scs = await listSubcasesBatch(BATCH_SIZE, KANSELARIJ_GRAPH);
    i++;
    for (const subcase of scs) {
      await generateSubmissionForSubcase(subcase);
    }
    if (scs.length < BATCH_SIZE) {
      break;
    }
  }

  await update(queries.constructRemoveFlagQuery(KANSELARIJ_GRAPH));

  console.log("Done running migrations! Don't forget to re-run Yggdrasil for fixing data in all graphs");
}());
