from django.urls import path
from .views import UploadCSV, HistoryList, HistoryDetail, ReportPDF, LatestReportPDF

urlpatterns = [
    path("upload/", UploadCSV.as_view(), name="upload"),
    path("history/", HistoryList.as_view(), name="history"),
    path("history/<int:pk>/", HistoryDetail.as_view(), name="history-detail"),
    path("report/<int:pk>/", ReportPDF.as_view(), name="report"),
    path("report/latest/", LatestReportPDF.as_view(), name="report-latest"),
]
