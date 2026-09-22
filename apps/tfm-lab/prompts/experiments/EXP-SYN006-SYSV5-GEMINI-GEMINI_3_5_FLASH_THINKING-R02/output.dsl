Officer:
(receive Credit card application)
user Check provided information
Is application complete?
No
send Request missing information
(finish Application stopped)

Officer:
(receive Credit card application)
user Check provided information
Is application complete?
Yes
user Perform credit check
What is the credit result?
Approved
service Create card account
service Order card
send Send approval message
(finish Card approved)

Officer:
(receive Credit card application)
user Check provided information
Is application complete?
Yes
user Perform credit check
What is the credit result?
Declined
send Send rejection message
(finish Card declined)

Officer:
(receive Credit card application)
user Check provided information
Is application complete?
Yes
user Perform credit check
What is the credit result?
Borderline
Supervisor: user Review application
Is application approved?
Yes
Officer: service Create card account
service Order card
send Send approval message
(finish Card approved)

Officer:
(receive Credit card application)
user Check provided information
Is application complete?
Yes
user Perform credit check
What is the credit result?
Borderline
Supervisor: user Review application
Is application approved?
No
Officer: send Send rejection message
(finish Card declined)

== pools ==
Bank -> Officer; Supervisor
