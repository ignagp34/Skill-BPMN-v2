Buyer:
send Purchase Order
receive Order Confirmation
Order Accepted

Buyer:
send Purchase Order
receive Revised Offer
user Review Revised Offer
Is revised offer accepted?
Yes
send Acceptance
receive Final Confirmation
Order Accepted

Buyer:
send Purchase Order
receive Revised Offer
user Review Revised Offer
Is revised offer accepted?
No
send Rejection
Order Rejected

Supplier:
(receive Purchase Order)
service Check Stock Availability
Are all items available?
Yes
send Order Confirmation

Supplier:
(receive Purchase Order)
service Check Stock Availability
Are all items available?
No
send Revised Offer
(receive Acceptance)
send Final Confirmation

Supplier:
(receive Purchase Order)
service Check Stock Availability
Are all items available?
No
send Revised Offer
(receive Rejection)
service Close Order Request