Agency Officer: (receive Application form and supporting budget file received)
user Register application
[Application form]
[Supporting budget file]
[db Grants database]
user Check application form
[Application form]
user Review budget file
[Supporting budget file]
rule Consult eligibility rules
[Eligibility rules]
//Incomplete applications must not be assessed for merit
Is information missing?
Yes
user Record missing information issue
[Missing information issue]
[db Grants database]
send Request completion
(finish Completion requested)

Agency Officer: (receive Application form and supporting budget file received)
user Register application
[Application form]
[Supporting budget file]
[db Grants database]
user Check application form
[Application form]
user Review budget file
[Supporting budget file]
rule Consult eligibility rules
[Eligibility rules]
//Incomplete applications must not be assessed for merit
Is information missing?
No
user Write evaluation report
[Evaluation report]
user Store evaluation report
[Evaluation report]
[db Case repository]
user Issue recommendation for decision
[Recommendation]
(finish Recommendation issued)

== pools ==
Public administration agency -> Agency Officer
