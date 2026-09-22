(receive Dispute letter)
[Dispute Letter]
[db Billing System]
Billing Specialist: user Open patient account
[Invoice]
[Treatment Record]
[Insurance Response]
user Review billing evidence
Is the disputed charge correct?
Yes
send Send explanation letter
[Explanation Letter]
user Close dispute
(finish Patient informed that charge is correct)

(receive Dispute letter)
[Dispute Letter]
[db Billing System]
user Open patient account
[Invoice]
[Treatment Record]
[Insurance Response]
user Review billing evidence
Is the disputed charge correct?
No
//Adjustments require documented justification
user Prepare adjustment form
[Adjustment Form]
[db Billing System]
user Update billing system
[db Billing System]
user Issue corrected invoice
[Corrected Invoice]
send Send corrected invoice to patient
(finish Patient informed with corrected invoice)
