Buyer:
(start Purchase needed)
send Purchase Order
(receive Order Confirmation)
(finish Order confirmed)

Buyer:
(start Purchase needed)
send Purchase Order
(receive Revised Offer)
Review revised offer
Accept revised offer?
Yes
send Acceptance
(receive Final Confirmation)
(finish Order confirmed)

Buyer:
(start Purchase needed)
send Purchase Order
(receive Revised Offer)
Review revised offer
Accept revised offer?
No
send Rejection
(finish Order rejected)

Supplier:
(receive Purchase Order)
Check stock availability
Are items available?
Yes
send Order Confirmation
(finish Order confirmed)

Supplier:
(receive Purchase Order)
Check stock availability
Are items available?
No
send Revised Offer
...

...
send Revised Offer
(receive Acceptance)
send Final Confirmation
(finish Order confirmed)

...
send Revised Offer
(receive Rejection)
Close order request
(finish Order rejected)