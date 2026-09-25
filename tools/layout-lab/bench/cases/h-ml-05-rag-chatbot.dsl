Legal Counsel: (start Need for an internal policy assistant)
Legal Counsel: Select approved policy documents
[Policy corpus]
(send Document package)
(receive Assistant ready for review)
Legal Counsel: Review a sample of assistant answers
(finish Assistant approved for employees)

Data Engineer: (receive Document package)
Data Engineer: Split documents into chunks
(send Embedding batch)
(receive Embedding vectors)
Data Engineer: Load vectors into the vector index
[db Vector index]
Prompt Engineer: Draft system prompt and answer guidelines|QA Analyst: Build evaluation question set
QA Analyst: Run retrieval-augmented answers against the evaluation set
Are grounded answers above 90 percent?
Yes
(send Assistant ready for review)

Data Engineer: (receive Document package)
Data Engineer: Split documents into chunks
(send Embedding batch)
(receive Embedding vectors)
Data Engineer: Load vectors into the vector index
Prompt Engineer: Draft system prompt and answer guidelines|QA Analyst: Build evaluation question set
QA Analyst: Run retrieval-augmented answers against the evaluation set
Are grounded answers above 90 percent?
No
Prompt Engineer: Tune retrieval parameters and prompt wording
QA Analyst: Run retrieval-augmented answers against the evaluation set

LLM API: (receive Embedding batch)
service Compute embeddings with the hosted model
(send Embedding vectors)

== pools ==
Legal Department -> Legal Counsel
AI Team -> Data Engineer; Prompt Engineer; QA Analyst
LLM Vendor -> LLM API
