Officer:
receive Receive application
user Check provided information
Is mandatory information missing?
Yes
send Ask customer to submit missing information

Officer:
receive Receive application
user Check provided information
Is mandatory information missing?
No
service Perform credit check
What is the credit result?
Approved
service Create card account
service Order card
send Send approval message

Officer:
receive Receive application
user Check provided information
Is mandatory information missing?
No
service Perform credit check
What is the credit result?
Borderline
send Send application to supervisor
Supervisor:
user Review application
Is application approved?
Yes
Officer:
service Create card account
service Order card
send Send approval message

Officer:
receive Receive application
user Check provided information
Is mandatory information missing?
No
service Perform credit check
What is the credit result?
Borderline
send Send application to supervisor
Supervisor:
user Review application
Is application approved?
No
Officer:
send Send rejection message

Officer:
receive Receive application
user Check provided information
Is mandatory information missing?
No
service Perform credit check
What is the credit result?
Declined
send Send rejection message