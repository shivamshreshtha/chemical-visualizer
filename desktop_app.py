import sys
import requests
import pandas as pd
from PyQt5.QtWidgets import (
    QApplication, QWidget, QPushButton, QVBoxLayout,
    QFileDialog, QLabel, QTableWidget, QTableWidgetItem
)
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg
from matplotlib.figure import Figure


API_URL = "http://127.0.0.1:8000/api/upload/"


class ChartCanvas(FigureCanvasQTAgg):
    def __init__(self):
        self.fig = Figure(figsize=(6,4))
        self.ax = self.fig.add_subplot(111)
        super().__init__(self.fig)


class App(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Chemical Equipment Desktop Visualizer")
        self.setGeometry(200, 100, 900, 700)

        layout = QVBoxLayout()

        self.label = QLabel("Upload CSV File")
        layout.addWidget(self.label)

        self.btn = QPushButton("Select CSV")
        self.btn.clicked.connect(self.upload_csv)
        layout.addWidget(self.btn)

        self.table = QTableWidget()
        layout.addWidget(self.table)

        self.chart = ChartCanvas()
        layout.addWidget(self.chart)

        self.setLayout(layout)

    def upload_csv(self):
        path, _ = QFileDialog.getOpenFileName(
            self, "Open CSV", "", "CSV Files (*.csv)"
        )

        if not path:
            return

        files = {"file": open(path, "rb")}
        response = requests.post(API_URL, files=files)

        if response.status_code != 200:
            self.label.setText("Upload Failed")
            return

        data = response.json()
        self.label.setText("Upload Successful")

        self.populate_table(data)
        self.draw_chart(data)

    def populate_table(self, data):
        rows = data["preview"]
        cols = data["columns"]

        self.table.setColumnCount(len(cols))
        self.table.setRowCount(len(rows))
        self.table.setHorizontalHeaderLabels(cols)

        for i, row in enumerate(rows):
            for j, val in enumerate(row):
                self.table.setItem(i, j, QTableWidgetItem(str(val)))

    def draw_chart(self, data):
        self.chart.ax.clear()

        names = [r[0] for r in data["preview"]]
        flow = [r[2] for r in data["preview"]]

        self.chart.ax.bar(names, flow)
        self.chart.ax.set_title("Flowrate by Equipment")
        self.chart.ax.set_xticklabels(names, rotation=45, ha="right")

        self.chart.draw()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = App()
    window.show()
    sys.exit(app.exec_())
