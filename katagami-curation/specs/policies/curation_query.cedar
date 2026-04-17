// Katagami Curation Query — Cedar Policies
//
// All principals can manage curation queries. The query is the
// entry point for the automated pipeline (research -> synthesize -> organize).

permit(
  principal,
  action,
  resource is CurationQuery
);
