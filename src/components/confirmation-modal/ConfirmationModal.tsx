import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import React from "react";
import type { ConfirmationModalProps } from "./type";


const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ open, onConfirm, onCancel, trade }) => {


  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>Confirmation</DialogTitle>
      <DialogContent sx={{ width: "20vw" }}>
        <Typography variant="h6" className="font-bold">
          {trade.contractSize} {trade.symbol}
        </Typography>
        <Typography>Price: {trade.limitPrice}</Typography>
        <Typography>{trade.symbol}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} className="w-full  text-green-400 rounded-none mt-10">
          Cancel
        </Button>
        <Button onClick={onConfirm} className="w-full bg-green-400 text-white rounded-none mt-10">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationModal;
