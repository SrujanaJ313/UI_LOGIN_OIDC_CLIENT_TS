import React, { useEffect } from "react";
import CaseDataTable from "../CaseDataTable";
import CaseBarChart from "../CaseBarChart";
import CaseGuageChart from "../CaseGuageChart";
import { Grid, Paper, Typography } from "@mui/material";
import CaseStatusCard from "../CaseStatusCard";
import CaseAlerts from "../CaseAlerts";
// import { toast, ToastContainer } from "react-toastify";
// import 'react-toastify/dist/ReactToastify.css';
import { useSnackbar } from "../../../../context/SnackbarContext";

const DashboardLayout = () => {
  const showSnackbar = useSnackbar()
  useEffect(() => {
    showSnackbar("Logged in Successfully!");
  }, []);

  return (
    <>
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h5" className="py-3">
          Dashboard
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={3}>
          <Grid item xs={6} className="h-full">
            <Paper className="p-2" sx={{ height: 255 }}>
              <Typography variant="h6" className="pb-2">
                Units
              </Typography>
              <CaseGuageChart></CaseGuageChart>
            </Paper>
          </Grid>
          <Grid item xs={6} className="h-full">
            <Paper className="h-full">
              <Typography variant="h6" className="p-2">
                Alerts & Remainders
              </Typography>
              <CaseAlerts></CaseAlerts>
            </Paper>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <CaseStatusCard></CaseStatusCard>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={3}>
          <Grid item xs={6}>
            <Paper>
              <CaseDataTable></CaseDataTable>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper className="h-full p-2">
              <Typography variant="h6" className="pb-2">
                Employee Status
              </Typography>
              <CaseBarChart></CaseBarChart>
            </Paper>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
    {/* <ToastContainer /> */}
    {/* {showSnackbar("Logged in Successfully!",5000)} */}
    </>
  );
};

export default DashboardLayout;
