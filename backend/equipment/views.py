from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated

import pandas as pd

from .models import UploadHistory
from .serializers import UploadHistorySerializer


class UploadCSV(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    # ✅ runs BEFORE authentication/permission checks
    def initial(self, request, *args, **kwargs):
        print("UPLOAD AUTH HEADER =", request.headers.get("Authorization"))
        return super().initial(request, *args, **kwargs)

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        df = pd.read_csv(file)

        rows = int(len(df))
        columns = list(df.columns)
        preview = df.head(10).values.tolist()

        # Safer numeric conversion
        for col in ["Flowrate", "Pressure", "Temperature"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        averages = {
            "flowrate": float(df["Flowrate"].mean()) if "Flowrate" in df.columns else 0.0,
            "pressure": float(df["Pressure"].mean()) if "Pressure" in df.columns else 0.0,
            "temperature": float(df["Temperature"].mean()) if "Temperature" in df.columns else 0.0,
        }

        equipment_distribution = (
            df["Type"].value_counts().to_dict() if "Type" in df.columns else {}
        )

        UploadHistory.objects.create(
            filename=getattr(file, "name", "uploaded.csv"),
            rows=rows,
            columns=columns,
            preview=preview,
            averages=averages,
            equipment_distribution=equipment_distribution,
        )

        # Keep only last 5 uploads
        old_items = UploadHistory.objects.order_by("-created_at")[5:]
        for item in old_items:
            item.delete()

        return Response(
            {
                "message": "Upload OK",
                "rows": rows,
                "columns": columns,
                "preview": preview,
                "averages": averages,
                "equipment_distribution": equipment_distribution,
            },
            status=status.HTTP_200_OK,
        )


class HistoryList(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        print("HISTORY AUTH HEADER =", request.headers.get("Authorization"))
        return super().initial(request, *args, **kwargs)

    def get(self, request):
        qs = UploadHistory.objects.order_by("-created_at")[:5]
        return Response(UploadHistorySerializer(qs, many=True).data, status=status.HTTP_200_OK)


class HistoryDetail(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        print("HISTORY DETAIL AUTH HEADER =", request.headers.get("Authorization"))
        return super().initial(request, *args, **kwargs)

    def get(self, request, pk):
        try:
            obj = UploadHistory.objects.get(pk=pk)
        except UploadHistory.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(UploadHistorySerializer(obj).data, status=status.HTTP_200_OK)


class ReportPDF(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            obj = UploadHistory.objects.get(pk=pk)
        except UploadHistory.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="report_{pk}.pdf"'

        p = canvas.Canvas(response, pagesize=A4)
        _, height = A4

        y = height - 60
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, y, "Chemical Equipment Report")
        y -= 30

        p.setFont("Helvetica", 11)
        p.drawString(50, y, f"Filename: {obj.filename}")
        y -= 18
        p.drawString(50, y, f"Created At: {obj.created_at}")
        y -= 18
        p.drawString(50, y, f"Rows: {obj.rows}")
        y -= 25

        # Averages
        p.setFont("Helvetica-Bold", 12)
        p.drawString(50, y, "Averages")
        y -= 18
        p.setFont("Helvetica", 11)
        av = obj.averages or {}
        p.drawString(60, y, f"Flowrate: {float(av.get('flowrate', 0)):.2f}")
        y -= 16
        p.drawString(60, y, f"Pressure: {float(av.get('pressure', 0)):.2f}")
        y -= 16
        p.drawString(60, y, f"Temperature: {float(av.get('temperature', 0)):.2f}")
        y -= 25

        # Distribution
        p.setFont("Helvetica-Bold", 12)
        p.drawString(50, y, "Equipment Distribution")
        y -= 18
        p.setFont("Helvetica", 11)
        dist = obj.equipment_distribution or {}
        for k, v in dist.items():
            p.drawString(60, y, f"{k}: {v}")
            y -= 16
            if y < 60:
                p.showPage()
                y = height - 60

        p.showPage()
        p.save()
        return response

class LatestReportPDF(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        latest = UploadHistory.objects.order_by("-created_at").first()
        if not latest:
            return Response({"detail": "No uploads found"}, status=status.HTTP_404_NOT_FOUND)

        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="equipment_report_latest.pdf"'

        p = canvas.Canvas(response, pagesize=A4)
        width, height = A4

        y = height - 60
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, y, "Chemical Equipment Report (Latest Upload)")
        y -= 30

        p.setFont("Helvetica", 11)
        p.drawString(50, y, f"Filename: {latest.filename}")
        y -= 18
        p.drawString(50, y, f"Uploaded at: {latest.created_at}")
        y -= 18
        p.drawString(50, y, f"Rows: {latest.rows}")
        y -= 25

        # Averages
        p.setFont("Helvetica-Bold", 12)
        p.drawString(50, y, "Averages")
        y -= 18
        p.setFont("Helvetica", 11)
        av = latest.averages or {}
        p.drawString(60, y, f"Flowrate: {av.get('flowrate', 0):.2f}")
        y -= 16
        p.drawString(60, y, f"Pressure: {av.get('pressure', 0):.2f}")
        y -= 16
        p.drawString(60, y, f"Temperature: {av.get('temperature', 0):.2f}")
        y -= 25

        # Distribution
        p.setFont("Helvetica-Bold", 12)
        p.drawString(50, y, "Equipment Distribution")
        y -= 18
        p.setFont("Helvetica", 11)
        dist = latest.equipment_distribution or {}
        for k, v in dist.items():
            if y < 70:
                p.showPage()
                y = height - 60
                p.setFont("Helvetica", 11)
            p.drawString(60, y, f"{k}: {v}")
            y -= 16

        p.showPage()
        p.save()
        return response

