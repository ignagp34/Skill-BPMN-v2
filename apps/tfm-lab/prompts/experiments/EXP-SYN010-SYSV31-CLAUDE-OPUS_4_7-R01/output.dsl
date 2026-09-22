Buyer: send Purchase Order

Supplier:
(receive Purchase Order)
Check Stock Availability
Are all items available?
Yes
send Order Confirmation

Buyer:
(receive Order Confirmation)
Accept Order

Supplier:
(receive Purchase Order)
Check Stock Availability
Are all items available?
No
send Revised Offer

Buyer:
(receive Revised Offer)
Review Revised Offer
Does the buyer accept the revised offer?
Yes
send Acceptance

Supplier:
(receive Acceptance)
send Final Confirmation

Buyer:
(receive Final Confirmation)

Buyer:
(receive Revised Offer)
Review Revised Offer
Does the buyer accept the revised offer?
No
send Rejection

Supplier:
(receive Rejection)
Close Order Request
