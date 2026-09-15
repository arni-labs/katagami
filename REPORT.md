# Writing-source completion report

## Outcome

A complete reading reached the final Library of Congress nonfiction record. Its prepared ledger has 634 valid rows and passes the repository validator. The canonical ledger could not be updated because this session has read-only access to `.agents/`.

Wikidata reading stopped at the existing coverage. Shell requests to Wikidata fail during DNS resolution, the Superset browser CLI has no authenticated workspace, direct Chrome tab control timed out twice, and native Chrome control was denied. The official query result sets could not be enumerated without one of those routes.

## Coverage

| Source | Before | Repository after | Prepared artifact | Reason for any gap |
|---|---:|---:|---:|---|
| lcgft-nonfiction-forms | 35/634 | 35/634 | 634/634 | `.agents/` is read-only; the validated replacement is `lcgft-nonfiction-forms.completed.json`. |
| wikidata-literary-movements | 85/416 | 85/416 | 85/416 | The remaining 331 official records could not be enumerated through the available network or browser routes. |
| wikidata-literary-techniques | 0/440 | 0/440 | 0/440 | The 440 official records could not be enumerated through the available network or browser routes. |

The Library of Congress snapshot used for the completed reading is `genreForms.nt.gz` SHA-256 `302b3fcb4af01e9d4b055dbebf5cb18acedd8df40d6efbdaab10a93e0c445779`. Its parsed record file is `lcgft-all.json` SHA-256 `4d2a3e7d45dc0c3bac157861a424f4f52065c448a362ec9cea002a6e735da03a`. The prepared ledger is SHA-256 `0c91f6f10cdeb208d3420e0e6136911a2f758a240cf1f3159b95b2bd01c0c32f`.

## Library of Congress decisions

| Decision | Count |
|---|---:|
| Existing live rows | 15 |
| Cell candidates | 76 |
| Merge | 25 |
| Deferred | 29 |
| Declined | 489 |
| Total | 634 |

The 25 merge rows include 24 cells whose cached production documents already cite the same LCGFT page. `Recipes` maps to `cookbooks`, whose cached document does not contain the Recipes record. That source addition needs a numbered revision approval and a fresh production read with `baseHash` before it can run.

### Declines grouped by reason

| Reason | Count |
|---|---:|
| Cartographic or visual form | 109 |
| Broadcast, performed or recorded media | 89 |
| Administrative, legal or archival record | 82 |
| Other document or media category | 68 |
| Cataloguing or retrieval category | 32 |
| Data or research record | 36 |
| Promotional, transactional or event artifact | 21 |
| Purpose-defined or classroom material | 13 |
| Occasion-defined form | 13 |
| Reference umbrella | 7 |
| Subject- or institution-defined record | 5 |
| Publication schedule or carrier | 2 |
| Source-specific reason | 12 |

### Deferred terms

- Almanacs: a compilation form with centuries of work behind it; not read in this pass
- Autobiographical drama: fiction offers a prose practice, but the available record does not establish an equivalent dramatic tradition; revisit when a source names and describes that stage practice
- Biographies: a form with a real body of work and its own conventions; it sits between Autobiographies and Creative nonfiction at LC and was not read in this pass
- Business correspondence: This pass defers Business correspondence because it is a plausible epistolary practice, but the record gives no scope and does not distinguish its manner from the broader Correspondence form.
- Campaign speeches: a recognizable rhetorical practice, but this record only names the political occasion and gives no account of a separate form
- Conference papers and proceedings: conference papers may be a scholarly form, but this heading also covers abstracts, reports and proceedings as one publication package
- Devotional literature: a real body of work with its own registers; no leaf under it was needed for the records this pass was closing
- Georgics: Georgics keeps the Literature-slice deferred decision because Georgics as a genre, the didactic poem of husbandry after Virgil, is real, but the only Wikipedia article of that name is Virgil's poem and does not cover the genre. Pass 2 expected this term to stand on its own, it returns when a source treats the genre.
- High interest-low vocabulary books: may involve a controlled-language writing practice, but the record gives no scope beyond its placement under Readers
- Hornbooks (Primers): plausibly a historical instructional form, but the record gives no scope and does not distinguish them from textbooks
- Law reviews: a scholarly legal periodical form, but the record gives institutional origin without defining a separate writing practice
- Lectures: a delivery form covering everything spoken to an audience; the Royal Institution Christmas Lectures cell is the manner this pass needed and it is named from its own source
- Literary criticism: a real practice with its own registers; no leaf under it was needed for the writing collection this pass serves
- Little magazines: sits beside Zines and Newsletters; whether the three are one cell or three is the open question recorded on the Zines cell
- Meditations: LC files it under Devotional literature as thoughts on spiritual truths; whether it covers the Stoic practice the Hypomnemata cell names was not settled in this pass
- Newspapers: a major publication form, but the record defines no compositional practice beyond serial publication
- Online discussion forums: a documented conversational writing form, but the record also covers mailing lists and archives, leaving the cell boundary unclear
- Papal encyclicals: may be a long-lived authored form, but the record defines them administratively as papal pastoral letters
- Pastoral letters and charges: may form a religious epistolary tradition, but the record defines them chiefly by office and recipient
- Periodicals: a major publication form, but the record supplies only their placement under serial publications and no distinct writing practice
- Personal narratives: eyewitness accounts of wars and disasters; a real form, left for a pass that can read its body of work
- Prophecies: may be a literary form, but this record gives no scope and does not separate form from asserted content
- Psalters: a sustained devotional compilation form, but the record defines arrangement and use without describing a manner of composition
- Quotations: quotation collections have editorial practices, but the record defines a compilation category without an authored form
- School yearbooks: a collective commemorative form with recurring conventions, but the record emphasizes institutional record-keeping
- Self-help publications: a modern practice with a large body of work; not read in this pass
- Self-instructional works: may be a teaching form, but the record gives no scope that distinguishes them from the broader instructional category
- Special issues (Serial publications): may be a thematic editorial form, but the record gives no scope beyond their serial-publication placement
- Yearbooks: may be an annual documentary form, but the record defines no practice beyond serial and commemorative use

## Numbered cell proposals

These 76 items are proposals only. They do not authorize creation, relationships, studies, manifestations or publication. Every proposed cell uses the source vocabulary's name and the source record read in this pass. The proposals intentionally add no broader links, so no parent would gain children.

### R-NF-P1 (26 items)

1. Create private Draft cell `abbreviation-dictionaries`, named "Abbreviation dictionaries". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2025026126). Reason: Abbreviation dictionaries are a reference-writing form organized around abbreviations, distinct from acronym dictionaries in the source hierarchy. Expected result: one unlinked Draft cell. Dependencies: none.
2. Create private Draft cell `abstracts`, named "Abstracts". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026038). Reason: LCGFT defines Abstracts as a condensed scholarly form whose composition and use differ from the works they summarize. Expected result: one unlinked Draft cell. Dependencies: none.
3. Create private Draft cell `academic-theses`, named "Academic theses". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026039). Reason: The Academic theses record identifies a sustained academic form with a recognizable argument, apparatus and institutional history. Expected result: one unlinked Draft cell. Dependencies: none.
4. Create private Draft cell `annals-and-chronicles`, named "Annals and chronicles". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026045). Reason: LCGFT defines Annals and chronicles as a chronological narrative form that the record distinguishes from bare lists of dated events. Expected result: one unlinked Draft cell. Dependencies: none.
5. Create private Draft cell `apologetic-writings`, named "Apologetic writings". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2015026027). Reason: This pass proposes Apologetic writings because the source identifies a religious argumentative tradition that explains and defends a faith against external criticism. Expected result: one unlinked Draft cell. Dependencies: none.
6. Create private Draft cell `art-criticism`, named "Art criticism". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2018026112). Reason: The Art criticism record identifies a critical writing practice with a body of work across periods and schools. Expected result: one unlinked Draft cell. Dependencies: none.
7. Create private Draft cell `artists-statements`, named "Artists' statements". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2021026026). Reason: This pass proposes Artists' statements because the source identifies a first-person explanatory form in which artists describe their work or its ideas. Expected result: one unlinked Draft cell. Dependencies: none.
8. Create private Draft cell `bibliographies`, named "Bibliographies". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026048). Reason: For Bibliographies, the source establishes a reference form with established selection, description and ordering practices. Expected result: one unlinked Draft cell. Dependencies: none.
9. Create private Draft cell `biographical-dictionaries`, named "Biographical dictionaries". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2025026020). Reason: The Biographical dictionaries record identifies a reference form that composes many short lives as entries, without a continuous biographical narrative. Expected result: one unlinked Draft cell. Dependencies: none.
10. Create private Draft cell `book-reviews`, named "Book reviews". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026052). Reason: For Book reviews, the source establishes a critical form that evaluates a book for readers in a periodical or other publication. Expected result: one unlinked Draft cell. Dependencies: none.
11. Create private Draft cell `captivity-narratives`, named "Captivity narratives". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026056). Reason: The Captivity narratives record identifies a historical first-person narrative tradition about colonial captivity. Expected result: one unlinked Draft cell. Dependencies: none.
12. Create private Draft cell `case-studies`, named "Case studies". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2017026140). Reason: This pass proposes Case studies because the source identifies an analytical form organized around close treatment of one case or a small group of cases. Expected result: one unlinked Draft cell. Dependencies: none.
13. Create private Draft cell `catalogues-raisonnes`, named "Catalogues raisonnés". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026058). Reason: The Catalogues raisonnés record identifies a scholarly catalogue form that documents and annotates a maker's complete work. Expected result: one unlinked Draft cell. Dependencies: none.
14. Create private Draft cell `catechisms`, named "Catechisms". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2015026029). Reason: For Catechisms, the source establishes an instructional religious form commonly organized as questions and answers. Expected result: one unlinked Draft cell. Dependencies: none.
15. Create private Draft cell `chronologies`, named "Chronologies". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026062). Reason: For Chronologies, the source establishes a reference form that arranges events by date or time and is distinct from narrative chronicles. Expected result: one unlinked Draft cell. Dependencies: none.
16. Create private Draft cell `comics-criticism`, named "Comics criticism". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2022026025). Reason: LCGFT defines Comics criticism as a critical practice that studies comics as both literary and visual work. Expected result: one unlinked Draft cell. Dependencies: none.
17. Create private Draft cell `commentaries`, named "Commentaries". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2025026014). Reason: The Commentaries record identifies an explanatory form written alongside or about another text. Expected result: one unlinked Draft cell. Dependencies: none.
18. Create private Draft cell `community-cookbooks`, named "Community cookbooks". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2011026154). Reason: LCGFT defines Community cookbooks as a collective cookbook tradition combining contributed recipes with local history and recollection. Expected result: one unlinked Draft cell. Dependencies: none.
19. Create private Draft cell `concordances`, named "Concordances". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026066). Reason: LCGFT defines Concordances as a reference form that indexes a work's words with their locations and context. Expected result: one unlinked Draft cell. Dependencies: none.
20. Create private Draft cell `consilia`, named "Consilia". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2011026164). Reason: LCGFT defines Consilia as a historical legal-opinion genre written by Roman- or canon-law scholars for litigation. Expected result: one unlinked Draft cell. Dependencies: none.
21. Create private Draft cell `correspondence`, named "Correspondence". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2025026080). Reason: Correspondence is a broad epistolary form with sustained personal, public and literary practices. Expected result: one unlinked Draft cell. Dependencies: none.
22. Create private Draft cell `counterfactual-histories`, named "Counterfactual histories". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026072). Reason: LCGFT defines Counterfactual histories as a nonfiction narrative form that works through alternative outcomes of historical events. Expected result: one unlinked Draft cell. Dependencies: none.
23. Create private Draft cell `coutumes`, named "Coutumes". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2011026175). Reason: LCGFT defines Coutumes as a medieval French legal compilation tradition recording customary law. Expected result: one unlinked Draft cell. Dependencies: none.
24. Create private Draft cell `custumals`, named "Custumals". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2011026180). Reason: For Custumals, the source establishes a medieval English documentary form recording manorial custom and obligations. Expected result: one unlinked Draft cell. Dependencies: none.
25. Create private Draft cell `dance-reviews`, named "Dance reviews". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026079). Reason: The Dance reviews record identifies a critical form that evaluates dance performance for readers. Expected result: one unlinked Draft cell. Dependencies: none.
26. Create private Draft cell `debates`, named "Debates". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026083). Reason: For Debates, the source establishes an adversarial discursive form preserved through recording or transcription. Expected result: one unlinked Draft cell. Dependencies: none.

### R-NF-P2 (25 items)

1. Create private Draft cell `dictionaries`, named "Dictionaries". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026086). Reason: This pass proposes Dictionaries because the source identifies a reference form with established practices for defining and arranging entries. Expected result: one unlinked Draft cell. Dependencies: none.
2. Create private Draft cell `encyclopedias`, named "Encyclopedias". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026092). Reason: For Encyclopedias, the source establishes a reference-writing form that organizes explanatory entries across a field or many fields. Expected result: one unlinked Draft cell. Dependencies: none.
3. Create private Draft cell `ethnographies`, named "Ethnographies". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2018026013). Reason: This pass proposes Ethnographies because the source identifies an anthropological writing tradition based on the study and description of people and culture. Expected result: one unlinked Draft cell. Dependencies: none.
4. Create private Draft cell `eulogies`, named "Eulogies". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026095). Reason: LCGFT defines Eulogies as a commemorative speech form written to account for and praise a life. Expected result: one unlinked Draft cell. Dependencies: none.
5. Create private Draft cell `faqs`, named "FAQs". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026101). Reason: The FAQs record identifies a question-and-answer reference form built from recurring reader needs. Expected result: one unlinked Draft cell. Dependencies: none.
6. Create private Draft cell `family-histories`, named "Family histories". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026100). Reason: This pass proposes Family histories because the source identifies a narrative historical form that traces a family's lineage and events. Expected result: one unlinked Draft cell. Dependencies: none.
7. Create private Draft cell `field-guides`, named "Field guides". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2017026099). Reason: The Field guides record identifies an illustrated reference form written for identification outside the library or classroom. Expected result: one unlinked Draft cell. Dependencies: none.
8. Create private Draft cell `film-criticism`, named "Film criticism". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2021026007). Reason: This pass proposes Film criticism because the source identifies a critical writing practice devoted to the study and evaluation of film. Expected result: one unlinked Draft cell. Dependencies: none.
9. Create private Draft cell `flash-nonfiction`, named "Flash nonfiction". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2025026006). Reason: The Flash nonfiction record identifies a very short nonfiction form within creative nonfiction. Expected result: one unlinked Draft cell. Dependencies: none.
10. Create private Draft cell `grimoires`, named "Grimoires". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2018026089). Reason: The Grimoires record identifies a handbook tradition that records magical rites, instructions and formulae. Expected result: one unlinked Draft cell. Dependencies: none.
11. Create private Draft cell `guidebooks`, named "Guidebooks". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026108). Reason: For Guidebooks, the source establishes a practical travel-reference form combining description, selection and instruction. Expected result: one unlinked Draft cell. Dependencies: none.
12. Create private Draft cell `hagiographies`, named "Hagiographies". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2015026032). Reason: Hagiographies are a biographical religious tradition that tells lives as examples of faith. Expected result: one unlinked Draft cell. Dependencies: none.
13. Create private Draft cell `harmonies-reference-works`, named "Harmonies (Reference works)". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2015026034). Reason: The Harmonies (Reference works) record identifies a comparative reference form that places parallel passages together to show agreement. Expected result: one unlinked Draft cell. Dependencies: none.
14. Create private Draft cell `hornbooks-law`, named "Hornbooks (Law)". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2011026320). Reason: The Hornbooks (Law) record identifies a legal instructional genre that explains a field through settled principles and leading cases. Expected result: one unlinked Draft cell. Dependencies: none.
15. Create private Draft cell `interviews`, named "Interviews". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026115). Reason: Interviews are a question-and-answer discursive form shaped by exchange between interviewer and subject. Expected result: one unlinked Draft cell. Dependencies: none.
16. Create private Draft cell `law-commentaries`, named "Law commentaries". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2011026150). Reason: Law commentaries are a legal expository form that interprets a document section by section. Expected result: one unlinked Draft cell. Dependencies: none.
17. Create private Draft cell `legal-maxims`, named "Legal maxims". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2011026356). Reason: LCGFT defines Legal maxims as a concise legal form that states established principles for reuse and interpretation. Expected result: one unlinked Draft cell. Dependencies: none.
18. Create private Draft cell `letters-to-the-editor`, named "Letters to the editor". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2018026142). Reason: Letters to the editor is a public epistolary form written in response to a periodical's coverage or argument. Expected result: one unlinked Draft cell. Dependencies: none.
19. Create private Draft cell `love-letters`, named "Love letters". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2018026090). Reason: LCGFT defines Love letters as an epistolary form with a long literary and private tradition. Expected result: one unlinked Draft cell. Dependencies: none.
20. Create private Draft cell `manifestos`, named "Manifestos". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2017027243). Reason: Manifestos are a declarative form that states a person or group's aims, opinions and policies. Expected result: one unlinked Draft cell. Dependencies: none.
21. Create private Draft cell `marginalia`, named "Marginalia". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2023026017). Reason: Marginalia are a writing practice in which readers annotate and answer a text in its margins. Expected result: one unlinked Draft cell. Dependencies: none.
22. Create private Draft cell `music-criticism-and-reviews`, named "Music criticism and reviews". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026130). Reason: LCGFT defines Music criticism and reviews as a critical writing practice devoted to the study and evaluation of music. Expected result: one unlinked Draft cell. Dependencies: none.
23. Create private Draft cell `oral-histories`, named "Oral histories". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2011026431). Reason: LCGFT defines Oral histories as an interview-based historical form that preserves first-person testimony. Expected result: one unlinked Draft cell. Dependencies: none.
24. Create private Draft cell `phrase-books`, named "Phrase books". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026145). Reason: For Phrase books, the source establishes a practical bilingual or multilingual reference form organized around reusable expressions. Expected result: one unlinked Draft cell. Dependencies: none.
25. Create private Draft cell `pilgrimage-guides`, named "Pilgrimage guides". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2015026048). Reason: The Pilgrimage guides record identifies a devotional travel-guide tradition describing sites, objects and practices. Expected result: one unlinked Draft cell. Dependencies: none.

### R-NF-P3 (25 items)

1. Create private Draft cell `pirate-captivity-narratives`, named "Pirate captivity narratives". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2015026011). Reason: This pass proposes Pirate captivity narratives because the source identifies a captivity-narrative tradition centered on seizure by pirates. Expected result: one unlinked Draft cell. Dependencies: none.
2. Create private Draft cell `polemics`, named "Polemics". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2026026027). Reason: Polemics are an argumentative form written to oppose a position or party. Expected result: one unlinked Draft cell. Dependencies: none.
3. Create private Draft cell `policy-briefs`, named "Policy briefs". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2024026070). Reason: LCGFT defines Policy briefs as a concise professional form that explains evidence and recommends a policy choice. Expected result: one unlinked Draft cell. Dependencies: none.
4. Create private Draft cell `prefatory-works`, named "Prefatory works". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2024026049). Reason: For Prefatory works, the source establishes a paratextual form that introduces, frames or accounts for another work. Expected result: one unlinked Draft cell. Dependencies: none.
5. Create private Draft cell `press-releases`, named "Press releases". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026153). Reason: Press releases are a concise institutional announcement form written for public and press reuse. Expected result: one unlinked Draft cell. Dependencies: none.
6. Create private Draft cell `rechtsbucher`, named "Rechtsbücher". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2011026523). Reason: The Rechtsbücher record identifies a medieval German prose tradition compiling and commenting on civil, criminal, procedural and feudal law. Expected result: one unlinked Draft cell. Dependencies: none.
7. Create private Draft cell `religious-commentaries`, named "Religious commentaries". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2025026002). Reason: LCGFT defines Religious commentaries as an exegetical form that explains the meaning of a religious text. Expected result: one unlinked Draft cell. Dependencies: none.
8. Create private Draft cell `responsa-jewish-law`, named "Responsa (Jewish law)". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2011026533). Reason: For Responsa (Jewish law), the source establishes a question-and-answer legal tradition preserving rabbinic decisions. Expected result: one unlinked Draft cell. Dependencies: none.
9. Create private Draft cell `reviews`, named "Reviews". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026168). Reason: Reviews are a broad critical form that evaluates made work for an audience. Expected result: one unlinked Draft cell. Dependencies: none.
10. Create private Draft cell `scholia`, named "Scholia". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2018026072). Reason: For Scholia, the source establishes a classical commentary tradition of explanatory notes written on or beside a text. Expected result: one unlinked Draft cell. Dependencies: none.
11. Create private Draft cell `sermons`, named "Sermons". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2015026051). Reason: For Sermons, the source establishes a religious discursive form composed for oral delivery and preserved as writing. Expected result: one unlinked Draft cell. Dependencies: none.
12. Create private Draft cell `slave-narratives`, named "Slave narratives". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026176). Reason: The Slave narratives record identifies a first-person autobiographical tradition written or orally related by formerly enslaved people. Expected result: one unlinked Draft cell. Dependencies: none.
13. Create private Draft cell `speeches`, named "Speeches". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2011026363). Reason: For Speeches, the source establishes a broad rhetorical form composed for public delivery. Expected result: one unlinked Draft cell. Dependencies: none.
14. Create private Draft cell `spirit-writings`, named "Spirit writings". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2015026052). Reason: This pass proposes Spirit writings because the source identifies an automatic-writing practice attributed by its makers to spirits. Expected result: one unlinked Draft cell. Dependencies: none.
15. Create private Draft cell `sports-writing`, named "Sports writing". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2017026121). Reason: The Sports writing record identifies a nonfiction tradition that reports, narrates and interprets sport. Expected result: one unlinked Draft cell. Dependencies: none.
16. Create private Draft cell `study-guides`, named "Study guides". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026182). Reason: The Study guides record identifies an instructional form organized to prepare a reader for an examination or course. Expected result: one unlinked Draft cell. Dependencies: none.
17. Create private Draft cell `technical-reports`, named "Technical reports". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2015026093). Reason: LCGFT defines Technical reports as a professional expository form used to record methods, findings and recommendations. Expected result: one unlinked Draft cell. Dependencies: none.
18. Create private Draft cell `television-criticism-and-reviews`, named "Television criticism and reviews". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2021026032). Reason: Television criticism and reviews are a critical writing practice devoted to the study and evaluation of television. Expected result: one unlinked Draft cell. Dependencies: none.
19. Create private Draft cell `television-program-reviews`, named "Television program reviews". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026190). Reason: The Television program reviews record identifies a review form that evaluates individual television programs for readers. Expected result: one unlinked Draft cell. Dependencies: none.
20. Create private Draft cell `textbooks`, named "Textbooks". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026191). Reason: LCGFT defines Textbooks as an instructional book form organized to teach a field in sequence. Expected result: one unlinked Draft cell. Dependencies: none.
21. Create private Draft cell `theater-reviews`, named "Theater reviews". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026194). Reason: LCGFT defines Theater reviews as a critical form that evaluates stage productions for readers. Expected result: one unlinked Draft cell. Dependencies: none.
22. Create private Draft cell `tracts-ephemera`, named "Tracts (Ephemera)". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2015026053). Reason: The Tracts (Ephemera) record identifies a short persuasive pamphlet tradition used for religious or political argument. Expected result: one unlinked Draft cell. Dependencies: none.
23. Create private Draft cell `true-adventure-stories`, named "True adventure stories". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026202). Reason: The True adventure stories record identifies a creative-nonfiction form narrating dangerous or exceptional pursuits as fact. Expected result: one unlinked Draft cell. Dependencies: none.
24. Create private Draft cell `true-crime-stories`, named "True crime stories". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2014026203). Reason: For True crime stories, the source establishes a nonfiction crime-narrative tradition written in a novelistic manner for general readers. Expected result: one unlinked Draft cell. Dependencies: none.
25. Create private Draft cell `underground-periodicals`, named "Underground periodicals". Evidence: [LCGFT record](https://id.loc.gov/authorities/genreForms/gf2022026008). Reason: This pass proposes Underground periodicals because the source identifies a countercultural periodical tradition published by radical and anti-establishment groups. Expected result: one unlinked Draft cell. Dependencies: none.

## Production changes

| Source | Cells minted | Existing cells revised | Parent cells that gained children |
|---|---:|---:|---:|
| lcgft-nonfiction-forms | 0 | 0 | 0 |
| wikidata-literary-movements | 0 | 0 | 0 |
| wikidata-literary-techniques | 0 | 0 | 0 |

No production operation ran. The task did not include numbered approval for content changes, and this environment could not reach the production API. No parent gained children, so no parent question or child count changed.

## Repository and delivery blockers

- Writes to `.agents/skills/encyclopedia/sources/lcgft-nonfiction-forms.json` fail with `EPERM`. The same read-only mount covers the other two ledgers.
- The Git metadata directory is read-only in this session, so a commit cannot be created.
- GitHub and Wikidata fail DNS resolution from the shell. A push could not run even if a commit existed.
- Linear and Temper MCP tools are not available in this session, so their existing ARN-118 records could not be updated.
