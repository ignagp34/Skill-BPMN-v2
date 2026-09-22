Buyer:
(start Order Needed)
(send Purchase Order)
(receive Order Confirmation)
(finish Order Accepted)

Buyer:
(start Order Needed)
(send Purchase Order)
(receive Revised Offer)
user Review revised offer
Accept revised offer?
Yes
(send Offer Acceptance)
(receive Final Confirmation)
(finish Order Accepted)

Buyer:
(start Order Needed)
(send Purchase Order)
(receive Revised Offer)
user Review revised offer
Accept revised offer?
No
(send Offer Rejection)
(finish Order Cancelled)

Supplier:
(receive Purchase Order)
user Check stock availability
Is all items available?
Yes
(send Order Confirmation)
(finish Order Confirmed)

Supplier:
(receive Purchase Order)
user Check stock availability
Is all items available?
No
(send Revised Offer)
(receive Offer Acceptance)
(send Final Confirmation)
(finish Order Confirmed)

Supplier:
(receive Purchase Order)
user Check stock availability
Is all items available?
No
(send Revised Offer)
(receive Offer Rejection)
user Close order request
(finish Order Request Closed)

== pools ==
Buyer Company -> Buyer
Supplier Company -> Supplier
